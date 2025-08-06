from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64

def encrypt_aes_gcm(plaintext, key, aad):
    cipher = AES.new(key, AES.MODE_GCM)
    cipher.update(aad)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)
    return cipher.nonce, ciphertext, tag

def decrypt_aes_gcm(nonce, ciphertext, tag, key, aad):
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    cipher.update(aad)
    return cipher.decrypt_and_verify(ciphertext, tag)

def main():
    # Step 1: Input
    plaintext = input("Enter plaintext: ").encode()
    aad = input("Enter AAD (Additional Authenticated Data): ").encode()

    # Step 2: Key and Encrypt
    key = get_random_bytes(16)  # AES-128
    nonce, ciphertext, tag = encrypt_aes_gcm(plaintext, key, aad)

    # Print encrypted output
    print("\nEncrypted:")
    print("Ciphertext (Base64):", base64.b64encode(ciphertext).decode())
    print("Tag (Base64):", base64.b64encode(tag).decode())
    print("Nonce (Base64):", base64.b64encode(nonce).decode())

    # Step 3: Tampering?
    tamper = input("\nDo you want to tamper the AAD? (yes/no): ").strip().lower()

    if tamper == "yes":
        aad = b"TAMPERED_" + aad  # Tamper AAD
        print("✅ AAD was tampered.")
    else:
        print("✅ AAD was not tampered.")

    # Step 4: Decrypt
    try:
        decrypted = decrypt_aes_gcm(nonce, ciphertext, tag, key, aad)
        print("\n🔓 Decrypted:", decrypted.decode())
    except ValueError:
        print("\n❌ Tampering detected! Authentication failed. Decryption aborted.")

if __name__ == "__main__":
    main()
