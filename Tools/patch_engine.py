# ============================================================================
# RUNDOWNREC - CLIENT NETWORK SIGNATURE BINARY PATCHER
# Save as: tools/patch_engine.py
# ============================================================================

import os

# The direct relative metadata payload file path inside classic Unity builds
METADATA_PATH = "RecRoom_Data/IL2CPP_Data/Metadata/global-metadata.dat"

# Target original dead tracking destinations vs local emulator targets
OLD_NET = b"ns.rec.net"
NEW_NET = b"localhost:2059"

OLD_PHOTON = b"photoncloud.com"
NEW_PHOTON = b"127.0.0.1:5055"

def deploy_patch():
    if not os.path.exists(METADATA_PATH):
        print(f"\x1b[31m[ERROR] Base path missing! Verify folder structure matches:\x1b[0m")
        print(f"       -> Expected: {METADATA_PATH}")
        print("\n[!] Tip: Make sure you placed the project folder inside your Rec Room client directory.")
        return

    print(f"Reading target network strings from {METADATA_PATH}...")
    with open(METADATA_PATH, "rb") as f:
        binary_data = f.read()

    patched = False
    
    # 1. Overwrite Web Authenticators with Safe Data Padding
    if OLD_NET in binary_data:
        pad = len(OLD_NET) - len(NEW_NET)
        str_patch = NEW_NET + (b"\x00" * pad)
        binary_data = binary_data.replace(OLD_NET, str_patch)
        print("\x1b[32m[+] Account Web Request endpoint hooks modified successfully.\x1b[0m")
        patched = True

    # 2. Redirect Real-time PUN Networking Structures
    if OLD_PHOTON in binary_data:
        pad = len(OLD_PHOTON) - len(NEW_PHOTON)
        str_patch = NEW_PHOTON + (b"\x00" * pad)
        binary_data = binary_data.replace(OLD_PHOTON, str_patch)
        print("\x1b[32m[+] Real-time multi-connection room paths successfully redirected.\x1b[0m")
        patched = True

    if patched:
        with open(METADATA_PATH, "wb") as f:
            f.write(binary_data)
        print("\n\x1b[32m[SUCCESS] Client infrastructure compiled flawlessly. You are ready to host!\x1b[0m")
    else:
        print("\n\x1b[33m[!] Operational structures already patched or configuration format signature not found.\x1b[0m")

if __name__ == "__main__":
    deploy_patch()
