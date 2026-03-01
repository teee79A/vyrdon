#include <tunables/global>

profile asus-codex-engine flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>
  #include <abstractions/openssl>

  deny /etc/** rwklx,
  deny /usr/** wklx,
  deny /root/** rwklx,
  deny /opt/vyrdon/** rwklx,

  /usr/bin/node mr,
  /home/t79/ASUS/codex/engine/dist/** r,

  /home/t79/ASUS/codex/system/** rw,
  /home/t79/ASUS/codex/memory/** rw,
  /home/t79/ASUS/codex/workspace/** rw,
  /home/t79/ASUS/codex/archive/** rw,
  /home/t79/ASUS/codex/logs/** rw,
  /home/t79/ASUS/codex/config/** rw,
  /home/t79/ASUS/codex/rules/** rw,

  /home/t79/.vyrdon_secrets/** r,
  /home/t79/.asus_secrets/** r,

  network inet stream,
  network inet6 stream,

  capability net_bind_service,
}
