import ctypes, errno, os, socket, subprocess, tempfile, sys
from pathlib import Path
# Linux-only diagnostic: python scripts/validate-offline.py /path/to/claude [target]
if len(sys.argv) < 2:
    sys.exit("Usage: python scripts/validate-offline.py /path/to/claude [manifest-or-directory]")
binary = str(Path(sys.argv[1]).resolve())
target = str(Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).resolve().parents[1]).resolve())
# Add a restriction to this process and all descendants. Do not relax the host sandbox.
lib = ctypes.CDLL('libseccomp.so.2', use_errno=True)
lib.seccomp_init.argtypes=[ctypes.c_uint32]; lib.seccomp_init.restype=ctypes.c_void_p
lib.seccomp_syscall_resolve_name.argtypes=[ctypes.c_char_p]; lib.seccomp_syscall_resolve_name.restype=ctypes.c_int
lib.seccomp_rule_add.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_uint]
lib.seccomp_load.argtypes=[ctypes.c_void_p]
ctx=lib.seccomp_init(0x7fff0000)
assert ctx
for name in ('socket','connect','sendto','sendmsg','sendmmsg','io_uring_setup'):
    num=lib.seccomp_syscall_resolve_name(name.encode())
    if num>=0: assert lib.seccomp_rule_add(ctx,0x00050000|errno.EPERM,num,0)==0
assert lib.seccomp_load(ctx)==0
try:
    socket.socket(socket.AF_INET,socket.SOCK_STREAM)
    raise RuntimeError('Network restriction not enforced')
except PermissionError:
    print('Confirmed: network sockets denied by kernel',flush=True)
with tempfile.TemporaryDirectory(prefix='ecc-validator-config-') as config:
    env={'PATH':'/usr/local/bin:/usr/bin:/bin','CLAUDE_CONFIG_DIR':config,
         'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC':'1','DISABLE_TELEMETRY':'1',
         'DISABLE_ERROR_REPORTING':'1','DISABLE_AUTOUPDATER':'1',
         'CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL':'1'}
    result=subprocess.run([binary,'plugin','validate',target],env=env,cwd='/tmp',capture_output=True,text=True,timeout=40,close_fds=True)
    print('Exit:',result.returncode)
    print(result.stdout)
    print(result.stderr)

    sys.exit(result.returncode)
