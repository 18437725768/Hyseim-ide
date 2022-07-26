/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { escape } from 'vs/base/common/strings';
import { localize } from 'vs/nls';

export default () => `
<div class="welcomePageContainer">
	<div class="welcomePage">
		<div class="title" style="display:block">
			<h1 class="caption">Hyseim IDE</h1>
			<!--p class="subtitle detail">Powered by Visual Studio Code</p-->
		</div>
		<div class="row">
			<div class="splash">
				<div class="section start">
					<h2 class="caption">${escape(localize('welcomePage.start', "Start"))}</h2>
					<ul>
						<li><a href="command:workbench.action.files.newUntitledFile">${escape(localize('welcomePage.newFile', "New file"))}</a></li>
						<li class="mac-only"><a href="command:workbench.action.files.openFileFolder">${escape(localize('welcomePage.openFolder', "Open folder..."))}</a></li>
						<li class="windows-only linux-only"><a href="command:workbench.action.files.openFolder">${escape(localize('welcomePage.openFolder', "Open folder..."))}</a></li>
						<li><a href="command:workbench.action.addRootFolder">${escape(localize('welcomePage.addWorkspaceFolder', "Add workspace folder..."))}</a></li>
					</ul>
				</div>
				<div class="section recent">
					<h2 class="caption">${escape(localize('welcomePage.recent', "Recent"))}</h2>
					<ul class="list">
						<!-- Filled programmatically -->
						<li class="moreRecent"><a href="command:workbench.action.openRecent">${escape(localize('welcomePage.moreRecent', "More..."))}</a><span class="path detail if_shortcut" data-command="workbench.action.openRecent">(<span class="shortcut" data-command="workbench.action.openRecent"></span>)</span></li>
					</ul>
					<p class="none detail">${escape(localize('welcomePage.noRecentFolders', "No recent folders"))}</p>
				</div>
				<!--div class="section help">
					<h2 class="caption">${escape(localize('welcomePage.help', "Help"))}</h2>
					<ul>
						<li class="keybindingsReferenceLink"><a href="command:workbench.action.keybindingsReference">${escape(localize('welcomePage.keybindingsCheatsheet', "Printable keyboard cheatsheet"))}</a></li>
						<li><a href="command:workbench.action.openIntroductoryVideosUrl">${escape(localize('welcomePage.introductoryVideos', "Introductory videos"))}</a></li>
						<li><a href="command:workbench.action.openTipsAndTricksUrl">${escape(localize('welcomePage.tipsAndTricks', "Tips and Tricks"))}</a></li>
						<li><a href="command:workbench.action.openDocumentationUrl">${escape(localize('welcomePage.productDocumentation', "Product documentation"))}</a></li>
						<li><a href="https://github.com/Microsoft/vscode">${escape(localize('welcomePage.gitHubRepository', "GitHub repository"))}</a></li>
						<li><a href="http://stackoverflow.com/questions/tagged/vscode?sort=votes&pageSize=50">${escape(localize('welcomePage.stackOverflow', "Stack Overflow"))}</a></li>
						<li><a href="command:workbench.action.openNewsletterSignupUrl">${escape(localize('welcomePage.newsletterSignup', "Join our Newsletter"))}</a></li>
					</ul>
				</div-->
				<p class="showOnStartup"><input type="checkbox" id="showOnStartup" class="checkbox"> <label class="caption" for="showOnStartup">${escape(localize('welcomePage.showOnStartup', "Show welcome page on startup"))}</label></p>
			</div>
			<div class="commands">
				<div class="section customize">
					<h2 class="caption">${escape(localize('welcomePage.customize', "Customize"))}</h2>
					<div class="list">
						<div class="item selectTheme"><button data-href="command:workbench.action.selectTheme"><h3 class="caption">${escape(localize('welcomePage.colorTheme', "Color theme"))}</h3> <span class="detail">${escape(localize('welcomePage.colorThemeDescription', "Make the editor and your code look the way you love"))}</span></button></div>
					</div>
				</div>
				<!--div class="section learn">
					<h2 class="caption">${escape(localize('welcomePage.learn', "Learn"))}</h2>
					<ul>
						<li class="showCommands"><button data-href="command:workbench.action.showCommands"><h3 class="caption">${escape(localize('welcomePage.showCommands', "Find and run all commands"))}</h3> <span class="detail">${escape(localize('welcomePage.showCommandsDescription', "Rapidly access and search commands from the Command Palette ({0})")).replace('{0}', '<span class="shortcut" data-command="workbench.action.showCommands"></span>')}</span></button></li>
						<li class="showInterfaceOverview"><button data-href="command:workbench.action.showInterfaceOverview"><h3 class="caption">${escape(localize('welcomePage.interfaceOverview', "Interface overview"))}</h3> <span class="detail">${escape(localize('welcomePage.interfaceOverviewDescription', "Get a visual overlay highlighting the major components of the UI"))}</span></button></li>
						<li class="showInteractivePlayground"><button data-href="command:workbench.action.showInteractivePlayground"><h3 class="caption">${escape(localize('welcomePage.interactivePlayground', "Interactive playground"))}</h3> <span class="detail">${escape(localize('welcomePage.interactivePlaygroundDescription', "Try essential editor features out in a short walkthrough"))}</span></button></li>
					</ul>
				</div-->
			</div>
		</div>
	</div>
</div>
`;
