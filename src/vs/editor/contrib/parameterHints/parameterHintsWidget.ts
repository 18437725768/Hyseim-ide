/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/base/browser/dom';
import { domEvent, stop } from 'vs/base/browser/event';
import * as aria from 'vs/base/browser/ui/aria/aria';
import { DomScrollableElement } from 'vs/base/browser/ui/scrollbar/scrollableElement';
import { Event } from 'vs/base/common/event';
import { IDisposable, Disposable, DisposableStore, MutableDisposable } from 'vs/base/common/lifecycle';
import 'vs/css!./parameterHints';
import { ContentWidgetPositionPreference, ICodeEditor, IContentWidget, IContentWidgetPosition } from 'vs/editor/browser/editorBrowser';
import { ConfigurationChangedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import * as modes from 'vs/editor/common/modes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { MarkdownRenderer } from 'vs/editor/contrib/markdown/markdownRenderer';
import { Context } from 'vs/editor/contrib/parameterHints/provideSignatureHelp';
import * as nls from 'vs/nls';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { editorHoverBackground, editorHoverBorder, textCodeBlockBackground, textLinkForeground } from 'vs/platform/theme/common/colorRegistry';
import { HIGH_CONTRAST, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { ParameterHintsModel, TriggerContext } from 'vs/editor/contrib/parameterHints/parameterHintsModel';

const $ = dom.$;

export class ParameterHintsWidget extends Disposable implements IContentWidget, IDisposable {

	private static readonly ID = 'editor.widget.parameterHintsWidget';

	private readonly markdownRenderer: MarkdownRenderer;
	private readonly renderDisposeables = this._register(new DisposableStore());
	private readonly model = this._register(new MutableDisposable<ParameterHintsModel>());
	private readonly keyVisible: IContextKey<boolean>;
	private readonly keyMultipleSignatures: IContextKey<boolean>;

	private domNodes?: {
		readonly element: HTMLElement;
		readonly signature: HTMLElement;
		readonly docs: HTMLElement;
		readonly overloads: HTMLElement;
		readonly scrollbar: DomScrollableElement;
	};

	private visible: boolean = false;
	private announcedLabel: string | null = null;

	// Editor.IContentWidget.allowEditorOverflow
	allowEditorOverflow = true;

	constructor(
		private readonly editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IModeService modeService: IModeService,
	) {
		super();
		this.markdownRenderer = this._register(new MarkdownRenderer(editor, modeService, openerService));
		this.model.value = new ParameterHintsModel(editor);
		this.keyVisible = Context.Visible.bindTo(contextKeyService);
		this.keyMultipleSignatures = Context.MultipleSignatures.bindTo(contextKeyService);

		this._register(this.model.value.onChangedHints(newParameterHints => {
			if (newParameterHints) {
				this.show();
				this.render(newParameterHints);
			} else {
				this.hide();
			}
		}));
	}

	private createParamaterHintDOMNodes() {
		const element = $('.editor-widget.parameter-hints-widget');
		const wrapper = dom.append(element, $('.wrapper'));
		wrapper.tabIndex = -1;

		const buttons = dom.append(wrapper, $('.buttons'));
		const previous = dom.append(buttons, $('.button.previous'));
		const next = dom.append(buttons, $('.button.next'));

		const onPreviousClick = stop(domEvent(previous, 'click'));
		this._register(onPreviousClick(this.previous, this));

		const onNextClick = stop(domEvent(next, 'click'));
		this._register(onNextClick(this.next, this));

		const overloads = dom.append(wrapper, $('.overloads'));

		const body = $('.body');
		const scrollbar = new DomScrollableElement(body, {});
		this._register(scrollbar);
		wrapper.appendChild(scrollbar.getDomNode());

		const signature = dom.append(body, $('.signature'));
		const docs = dom.append(body, $('.docs'));

		element.style.userSelect = 'text';

		this.domNodes = {
			element,
			signature,
			overloads,
			docs,
			scrollbar,
		};

		this.editor.addContentWidget(this);
		this.hide();

		this._register(this.editor.onDidChangeCursorSelection(e => {
			if (this.visible) {
				this.editor.layoutContentWidget(this);
			}
		}));

		const updateFont = () => {
			if (!this.domNodes) {
				return;
			}
			const fontInfo = this.editor.getOption(EditorOption.fontInfo);
			this.domNodes.element.style.fontSize = `${fontInfo.fontSize}px`;
		};

		updateFont();

		this._register(Event.chain<ConfigurationChangedEvent>(this.editor.onDidChangeConfiguration.bind(this.editor))
			.filter(e => e.hasChanged(EditorOption.fontInfo))
			.on(updateFont, null));

		this._register(this.editor.onDidLayoutChange(e => this.updateMaxHeight()));
		this.updateMaxHeight();
	}

	private show(): void {
		if (!this.model || this.visible) {
			return;
		}

		if (!this.domNodes) {
			this.createParamaterHintDOMNodes();
		}

		this.keyVisible.set(true);
		this.visible = true;
		setTimeout(() => {
			if (this.domNodes) {
				dom.addClass(this.domNodes.element, 'visible');
			}
		}, 100);
		this.editor.layoutContentWidget(this);
	}

	private hide(): void {
		if (!this.model || !this.visible) {
			return;
		}

		this.keyVisible.reset();
		this.visible = false;
		this.announcedLabel = null;
		if (this.domNodes) {
			dom.removeClass(this.domNodes.element, 'visible');
		}
		this.editor.layoutContentWidget(this);
	}

	getPosition(): IContentWidgetPosition | null {
		if (this.visible) {
			return {
				position: this.editor.getPosition(),
				preference: [ContentWidgetPositionPreference.ABOVE, ContentWidgetPositionPreference.BELOW]
			};
		}
		return null;
	}

	private render(hints: modes.SignatureHelp): void {
		if (!this.domNodes) {
			return;
		}

		const multiple = hints.signatures.length > 1;
		dom.toggleClass(this.domNodes.element, 'multiple', multiple);
		this.keyMultipleSignatures.set(multiple);

		this.domNodes.signature.innerHTML = '';
		this.domNodes.docs.innerHTML = '';

		const signature = hints.signatures[hints.activeSignature];

		if (!signature) {
			return;
		}

		const code = dom.append(this.domNodes.signature, $('.code'));
		const hasParameters = signature.parameters.length > 0;

		const fontInfo = this.editor.getOption(EditorOption.fontInfo);
		code.style.fontSize = `${fontInfo.fontSize}px`;
		code.style.fontFamily = fontInfo.fontFamily;

		if (!hasParameters) {
			const label = dom.append(code, $('span'));
			label.textContent = signature.label;

		} else {
			this.renderParameters(code, signature, hints.activeParameter);
		}

		this.renderDisposeables.clear();

		const activeParameter = signature.parameters[hints.activeParameter];

		if (activeParameter && activeParameter.documentation) {
			const documentation = $('span.documentation');
			if (typeof activeParameter.documentation === 'string') {
				documentation.textContent = activeParameter.documentation;
			} else {
				const renderedContents = this.markdownRenderer.render(activeParameter.documentation);
				dom.addClass(renderedContents.element, 'markdown-docs');
				this.renderDisposeables.add(renderedContents);
				documentation.appendChild(renderedContents.element);
			}
			dom.append(this.domNodes.docs, $('p', {}, documentation));
		}

		if (signature.documentation === undefined) { /** no op */ }
		else if (typeof signature.documentation === 'string') {
			dom.append(this.domNodes.docs, $('p', {}, signature.documentation));
		} else {
			const renderedContents = this.markdownRenderer.render(signature.documentation);
			dom.addClass(renderedContents.element, 'markdown-docs');
			this.renderDisposeables.add(renderedContents);
			dom.append(this.domNodes.docs, renderedContents.element);
		}

		let hasDocs = false;
		if (activeParameter && typeof (activeParameter.documentation) === 'string' && activeParameter.documentation.length > 0) {
			hasDocs = true;
		}
		if (activeParameter && typeof (activeParameter.documentation) === 'object' && activeParameter.documentation.value.length > 0) {
			hasDocs = true;
		}
		if (typeof (signature.documentation) === 'string' && signature.documentation.length > 0) {
			hasDocs = true;
		}
		if (typeof (signature.documentation) === 'object' && signature.documentation.value.length > 0) {
			hasDocs = true;
		}

		dom.toggleClass(this.domNodes.signature, 'has-docs', hasDocs);
		dom.toggleClass(this.domNodes.docs, 'empty', !hasDocs);

		let currentOverload = String(hints.activeSignature + 1);

		if (hints.signatures.length < 10) {
			currentOverload += `/${hints.signatures.length}`;
		}

		this.domNodes.overloads.textContent = currentOverload;

		if (activeParameter) {
			const labelToAnnounce = this.getParameterLabel(signature, hints.activeParameter);
			// Select method gets called on every user type while parameter hints are visible.
			// We do not want to spam the user with same announcements, so we only announce if the current parameter changed.

			if (this.announcedLabel !== labelToAnnounce) {
				aria.alert(nls.localize('hint', "{0}, hint", labelToAnnounce));
				this.announcedLabel = labelToAnnounce;
			}
		}

		this.editor.layoutContentWidget(this);
		this.domNodes.scrollbar.scanDomNode();
	}

	private renderParameters(parent: HTMLElement, signature: modes.SignatureInformation, currentParameter: number): void {

		const [start, end] = this.getParameterLabelOffsets(signature, currentParameter);

		const beforeSpan = document.createElement('span');
		beforeSpan.textContent = signature.label.substring(0, start);

		const paramSpan = document.createElement('span');
		paramSpan.textContent = signature.label.substring(start, end);
		paramSpan.className = 'parameter active';

		const afterSpan = document.createElement('span');
		afterSpan.textContent = signature.label.substring(end);

		dom.append(parent, beforeSpan, paramSpan, afterSpan);
	}

	private getParameterLabel(signature: modes.SignatureInformation, paramIdx: number): string {
		const param = signature.parameters[paramIdx];
		if (typeof param.label === 'string') {
			return param.label;
		} else {
			return signature.label.substring(param.label[0], param.label[1]);
		}
	}

	private getParameterLabelOffsets(signature: modes.SignatureInformation, paramIdx: number): [number, number] {
		const param = signature.parameters[paramIdx];
		if (!param) {
			return [0, 0];
		} else if (Array.isArray(param.label)) {
			return param.label;
		} else {
			const idx = signature.label.lastIndexOf(param.label);
			return idx >= 0
				? [idx, idx + param.label.length]
				: [0, 0];
		}
	}

	next(): void {
		if (this.model.value) {
			this.editor.focus();
			this.model.value.next();
		}
	}

	previous(): void {
		if (this.model.value) {
			this.editor.focus();
			this.model.value.previous();
		}
	}

	cancel(): void {
		if (this.model.value) {
			this.model.value.cancel();
		}
	}

	getDomNode(): HTMLElement {
		if (!this.domNodes) {
			this.createParamaterHintDOMNodes();
		}
		return this.domNodes!.element;
	}

	getId(): string {
		return ParameterHintsWidget.ID;
	}

	trigger(context: TriggerContext): void {
		if (this.model.value) {
			this.model.value.trigger(context, 0);
		}
	}

	private updateMaxHeight(): void {
		if (!this.domNodes) {
			return;
		}
		const height = Math.max(this.editor.getLayoutInfo().height / 4, 250);
		const maxHeight = `${height}px`;
		this.domNodes.element.style.maxHeight = maxHeight;
		const wrapper = this.domNodes.element.getElementsByClassName('wrapper') as HTMLCollectionOf<HTMLElement>;
		if (wrapper.length) {
			wrapper[0].style.maxHeight = maxHeight;
		}
	}
}

registerThemingParticipant((theme, collector) => {
	const border = theme.getColor(editorHoverBorder);
	if (border) {
		const borderWidth = theme.type === HIGH_CONTRAST ? 2 : 1;
		collector.addRule(`.monaco-editor .parameter-hints-widget { border: ${borderWidth}px solid ${border}; }`);
		collector.addRule(`.monaco-editor .parameter-hints-widget.multiple .body { border-left: 1px solid ${border.transparent(0.5)}; }`);
		collector.addRule(`.monaco-editor .parameter-hints-widget .signature.has-docs { border-bottom: 1px solid ${border.transparent(0.5)}; }`);
	}
	const background = theme.getColor(editorHoverBackground);
	if (background) {
		collector.addRule(`.monaco-editor .parameter-hints-widget { background-color: ${background}; }`);
	}

	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.addRule(`.monaco-editor .parameter-hints-widget a { color: ${link}; }`);
	}

	const codeBackground = theme.getColor(textCodeBlockBackground);
	if (codeBackground) {
		collector.addRule(`.monaco-editor .parameter-hints-widget code { background-color: ${codeBackground}; }`);
	}
});