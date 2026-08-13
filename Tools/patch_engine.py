import os

METADATA_PATH = "RecRoom_Data/IL2CPP_Data/Metadata/global-metadata.dat"

OLD_NET = b"ns.rec.net"
NEW_NET = b"localhost:2059"

OLD_PHOTON = b"photoncloud.com"
NEW_PHOTON = b"127.0.0.1:5055"

OLD_LOG = b"api.rec.net/api/images/v1/log"
NEW_LOG = b"localhost:2060/api/images/v1/log"

def deploy_patch():
    if not os.path.exists(METADATA_PATH):
        print(f"\x1b[31m[ERROR] Base path missing! Verify file layout location:\x1b[0m")
        print(f"       -> Expected: {METADATA_PATH}")
        print("\n[!] Tip: Place this repository folder directly inside your 2019 Rec Room game directory.")
        return

    print(f"Reading engine signatures from {METADATA_PATH}...")
    with open(METADATA_PATH, "rb") as f:
        binary_data = f.read()

    patched = False
    
    if OLD_NET in binary_data:
        pad = len(OLD_NET) - len(NEW_NET)
        str_patch = NEW_NET + (b"\x00" * pad)
        binary_data = binary_data.replace(OLD_NET, str_patch)
        print("\x1b[32m[+] Account authentication mapping rewritten.\x1b[0m")
        patched = True

    if OLD_PHOTON in binary_data:
        pad = len(OLD_PHOTON) - len(NEW_PHOTON)
        str_patch = NEW_PHOTON + (b"\x00" * pad)
        binary_data = binary_data.replace(OLD_PHOTON, str_patch)
        print("\x1b[32m[+] Real-time network sync tunnels redirected.\x1b[0m")
        patched = True

    if OLD_LOG in binary_data:
        pad = len(OLD_LOG) - len(NEW_LOG)
        str_patch = NEW_LOG + (b"\x00" * pad)
        binary_data = binary_data.replace(OLD_LOG, str_patch)
        print("\x1b[32m[+] Share camera pipeline rerouted to standalone bot port.\x1b[0m")
        patched = True

    if patched:
        with open(METADATA_PATH, "wb") as f:
            f.write(binary_data)
        print("\n\x1b[32m[SUCCESS] Binary layers compiled and patched successfully!\x1b[0m")
    else:
        print("\n\x1b[33m[!] Network paths are already patched or layout configurations match.\x1b[0m")

if __name__ == "__main__":
    deploy_patch()
