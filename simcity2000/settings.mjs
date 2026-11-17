// Browser shell for the original DOS program. SPDX-License-Identifier: GPL-2.0-or-later
export const RELEASE = new URL(import.meta.url).searchParams.get('v') ?? 'sc2k17nov1';
export const EMULATOR_VERSION = '8.5.3';
export function dosboxConfig() {
  return `[sdl]
autolock=false
fullscreen=false
output=surface
usescancodes=true
vsync=false
[dosbox]
machine=svga_s3
memsize=16
[cpu]
core=normal
cputype=auto
cycles=fixed 20000
[render]
frameskip=0
aspect=false
scaler=none
[mixer]
nosound=false
rate=44100
blocksize=1024
prebuffer=40
[midi]
mpu401=none
mididevice=none
[sblaster]
sbtype=sb16
sbbase=220
irq=7
dma=1
hdma=5
oplmode=auto
oplrate=44100
[speaker]
pcspeaker=true
tandy=off
[joystick]
joysticktype=none
[dos]
xms=true
ems=false
umb=true
[ipx]
ipx=false
[autoexec]
@echo off
mount c .
c:
cd SC2000
sc2000.exe
exit
`;
}
const special = { Escape:256, Enter:257, Tab:258, Backspace:259, Insert:260, Delete:261, ArrowRight:262, ArrowLeft:263, ArrowDown:264, ArrowUp:265,
  PageUp:266, PageDown:267, Home:268, End:269, CapsLock:280, ScrollLock:281, NumLock:282, PrintScreen:283, Pause:284,
  ShiftLeft:340, ControlLeft:341, AltLeft:342, ShiftRight:344, ControlRight:345, AltRight:346, Space:32,
  Minus:45, Equal:61, BracketLeft:91, BracketRight:93, Backslash:92, Semicolon:59, Quote:39, Backquote:96, Comma:44, Period:46, Slash:47,
  NumpadDecimal:330, NumpadDivide:331, NumpadMultiply:332, NumpadSubtract:333, NumpadAdd:334, NumpadEnter:335 };
export function dosKey(code) {
  if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
  if (/^Digit[0-9]$/.test(code)) return code.charCodeAt(5);
  if (/^Numpad[0-9]$/.test(code)) return 320 + Number(code.at(-1));
  if (/^F([1-9]|1[0-2])$/.test(code)) return 289 + Number(code.slice(1));
  return special[code] ?? null;
}
