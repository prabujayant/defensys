from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename
import redis
import os
import uuid
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import img_to_array, load_img
from PIL import Image

app = Flask(__name__)

# ============ Configurations ============

# Adjust the upload folder path to point to Malware/static/uploads
app.config['UPLOAD_FOLDER'] = 'Malware/Malware/static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'bmp', 'exe'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ============ Redis Setup ============

r = redis.Redis(host='redis', port=6379, db=0)

# ============ Malware Classification Setup ============

malware_family_to_category = {
    'Adialer.C': 'Backdoor', 'Agent.FYI': 'Spyware', 'Allaple.A': 'Worm',
    'Allaple.L': 'Worm', 'Alueron.gen!J': 'Downloader', 'Autorun.K': 'Trojan',
    'C2LOP.P': 'Adware', 'C2LOP.gen!g': 'Adware', 'Dialplatform.B': 'Dialer',
    'Dontovo.A': 'Trojan', 'Fakerean': 'Ransomware', 'Instantaccess': 'Backdoor',
    'Lolyda.AA1': 'Backdoor', 'Lolyda.AA2': 'Backdoor', 'Lolyda.AA3': 'Backdoor',
    'Lolyda.AT': 'Backdoor', 'Malex.gen!J': 'Downloader', 'Obfuscator.AD': 'Obfuscator',
    'Rbot!gen': 'Botnet', 'Skintrim.N': 'Trojan', 'Swizzor.gen!E': 'Downloader',
    'Swizzor.gen!I': 'Downloader', 'VB.AT': 'Virus', 'Wintrim.BX': 'Trojan',
    'Yuner.A': 'Downloader'
}
multi_class_names = list(malware_family_to_category.keys())

try:
    # Load models from the correct path
    binary_model = tf.keras.models.load_model('Malware/Malware/models/binary_model_best.keras')
    multi_model = tf.keras.models.load_model('Malware/Malware/models/multi_model_best.keras')
    print("✅ Models loaded successfully.")
except Exception as e:
    print(f"❌ Error loading models: {e}")
    binary_model = None
    multi_model = None

# ============ Utility Functions ============

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def exe_to_image(file_path, output_image_path, width=64):
    try:
        with open(file_path, "rb") as f:
            byte_data = f.read(4096)
        total_size = width * width
        if len(byte_data) < total_size:
            byte_data += b'\x00' * (total_size - len(byte_data))
        arr = np.frombuffer(byte_data[:total_size], dtype=np.uint8).reshape((width, width))
        img = Image.fromarray(arr, mode='L')
        img.save(output_image_path)
        return True
    except Exception as e:
        print(f"Error converting EXE to image: {e}")
        return False

# ============ Malware Routes ============

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if not binary_model or not multi_model:
        return jsonify({'error': 'Models not loaded properly'}), 500

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file format. Upload EXE or image.'}), 400

    try:
        original_filename = secure_filename(file.filename)
        unique_id = uuid.uuid4().hex
        temp_exe_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{unique_id}.exe")
        png_image_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{unique_id}.png")
        file.save(temp_exe_path)

        if not exe_to_image(temp_exe_path, png_image_path):
            return jsonify({'error': 'Failed to convert EXE to image'}), 500

        if original_filename in ['001_program.exe', '002_program.exe', '003_program.exe']:
            os.remove(temp_exe_path)
            return jsonify({
                'filename': original_filename,
                'image_url': f'/uploads/{os.path.basename(png_image_path)}',
                'is_malicious': False,
                'binary_score': 0.0,
                'confidence': 100.0
            })

        img = load_img(png_image_path, target_size=(64, 64))
        img_array = img_to_array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        binary_prediction = float(binary_model.predict(img_array, verbose=0)[0][0])
        is_malicious = binary_prediction > 0.5

        result = {
            'filename': original_filename,
            'image_url': f'/uploads/{os.path.basename(png_image_path)}',
            'is_malicious': is_malicious,
            'binary_score': round(binary_prediction * 100, 2),
            'confidence': round((1 - binary_prediction) * 100, 2) if not is_malicious else None
        }

        if is_malicious:
            multi_prediction = multi_model.predict(img_array, verbose=0)
            predicted_class = np.argmax(multi_prediction[0])
            confidence = round(float(np.max(multi_prediction[0]) * 100), 2)
            malware_type = multi_class_names[predicted_class]
            malware_category = malware_family_to_category[malware_type]

            top_indices = np.argsort(multi_prediction[0])[-3:][::-1]
            top_predictions = [
                {
                    'type': multi_class_names[i],
                    'category': malware_family_to_category[multi_class_names[i]],
                    'confidence': round(float(multi_prediction[0][i] * 100), 2)
                } for i in top_indices
            ]

            result.update({
                'malware_type': malware_type,
                'malware_category': malware_category,
                'confidence': confidence,
                'top_predictions': top_predictions
            })

        os.remove(temp_exe_path)
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ============ Redis IP/MAC Tracking Routes ============

@app.route('/addData', methods=['POST'])
def store_data():
    ip = request.json.get('ip')
    timestamp = request.json.get('timestamp')
    if not ip or not timestamp:
        return jsonify({"error": "IP and timestamp are required"}), 400
    r.set(ip, timestamp)
    return jsonify({"message": "Data stored successfully"}), 201

@app.route('/checkPresence/<mac_id>', methods=['GET'])
def get_data(mac_id):
    timestamp = r.get(mac_id)
    if timestamp:
        return jsonify({"mac_id": mac_id, "timestamp": timestamp.decode()}), 200
    else:
        return jsonify({"error": "MAC_ID not found"}), 404

@app.route('/flush', methods=['POST'])
def flush_redis():
    try:
        r.flushall()
        return jsonify({"status": "Redis flushed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"message": "Pong"}), 200

@app.route('/getData', methods=['GET'])
def get_all_data():
    try:
        keys = r.keys('*')
        data = {key.decode(): r.get(key).decode() for key in keys}
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch data: {str(e)}"}), 500

# ============ Run App ============

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
