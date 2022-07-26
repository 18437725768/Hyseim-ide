import { parseMI } from './mi2Parser';
import * as mdl from './syntaxError';

class Mi2SyntaxError extends mdl.Mi2SyntaxError {
	constructor(msg: string, fullOutput: string, output: string) {
		const l = fullOutput.substr(0, fullOutput.length - output.length);
		const o = '\x1B[0m' + output;
		super(
			msg,
			'\x1B[38;5;10m' + l + '\x1B[0m\x1B[38;5;9m' + o,
			o,
		);

		this.stack = this.stack.replace(/ {4}at .*parseMI\s+[\s\S]+$/, '').trim();
	}
}

Object.assign(mdl, {
	Mi2SyntaxError: Mi2SyntaxError,
});

[
	'*stopped,frame={addr="0x0000000080000564",func="timer_callback",args=[{name="ctx",value="0x0"}],file="/xxx/main.c",fullname="/xxx/main.c",line="46"},thread-id="1",stopped-threads="all"',
	'4+download,{section=".text",section-size="48800",total-size="620790"}',
	'2^done',
	'8^done,threads=[{id="1",target-id="Remote target",frame={level="0",addr="0x0000000080000000",func="_start",args=[],file="/path/pwm_standalone_3/hyseim_libraries/hyseim-standalone-sdk/lib/bsp/crt.S",fullname="/path/pwm_standalone_3/hyseim_libraries/hyseim-standalone-sdk/lib/bsp/crt.S",line="28"},state="stopped"}],current-thread-id="1"',
	'19^done,stack=[frame={level="0",addr="0x0000000080000528",func="timer_callback",file="/xxx/main.c",fullname="/xxx/main.c",line="40"},frame={level="1",addr="0x000000008000a96e",func="timer_interrupt_handler",file="/path/pwm_standalone_3/hyseim_libraries/hyseim-standalone-sdk/lib/drivers/timer.c",fullname="/path/pwm_standalone_3/hyseim_libraries/hyseim-standalone-sdk/lib/drivers/timer.c",line="290"},frame={level="2",addr="0x000000008000a0b8",func="handle_irq_m_ext",file="/path/pwm_standalone_3/hyseim_libraries/hyseim-standalone-sdk/lib/drivers/plic.c",fullname="/path/pwm_standalone_3/hyseim_libraries/hyseim-standalone-sdk/lib/drivers/plic.c",line="194"},frame={level="3",addr="0x0000000080000238",func=".handle_irq",file="/path/pwm_standalone_3/hyseim_libraries/hyseim-standalone-sdk/lib/bsp/crt.S",fullname="/path/pwm_standalone_3/hyseim_libraries/hyseim-standalone-sdk/lib/bsp/crt.S",line="233"}]',
	'*stopped,reason="breakpoint-hit",disp="keep",bkptno="2",frame={addr="0x0000000080000506",func="main",args=[],file="/path/hello_world_standalone_1/src/main.c",fullname="/path/hello_world_standalone_1/src/main.c",line="38"},thread-id="1",stopped-threads="all",core="0"',
	'7^done,bkpt={number="2",type="breakpoint",disp="keep",enabled="y",addr="<MULTIPLE>",times="0",original-location="-source /path/hyseim_libraries/hyseim-standalone-sdk/lib/bsp/sleep.c -line 24"},{number="2.1",enabled="y",addr="0x0000000080005376",func="usleep",file="/path/hyseim_libraries/hyseim-standalone-sdk/lib/bsp/sleep.c",fullname="/path/hyseim_libraries/hyseim-standalone-sdk/lib/bsp/sleep.c",line="24",thread-groups=["i1"]},{number="2.2",enabled="y",addr="0x000000008000537a",func="usleep",file="/path/hyseim_libraries/hyseim-standalone-sdk/lib/bsp/sleep.c",fullname="/path/hyseim_libraries/hyseim-standalone-sdk/lib/bsp/sleep.c",line="24",thread-groups=["i1"]}'
].forEach((i) => {
	console.log(parseMI(i));
});
