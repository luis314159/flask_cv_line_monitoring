from flask import Flask, render_template, Response, request, jsonify, send_file
import cv2
import os
from datetime import datetime
from threading import Thread
from image_processing import process_image
import serial
import argparse
import logging
from processing import *
import json
from flask import Flask, render_template, Response, request, jsonify
import threading
import logging

target_label = 'stack_light'
current_bounding_boxes = []
bounding_boxes = None

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

def process_frame(frame):
    global target_label
    global bounding_boxes
    global current_bounding_boxes

    if frame is None or frame.size == 0:
        print("Received an empty frame.")
        return None

    print("Frame received for processing")
    processed_frame, bounding_boxes = plot_frame_with_classification(frame, target_label)
    current_bounding_boxes = bounding_boxes
    print("Frame processed successfully")

    return processed_frame, bounding_boxes

@app.route('/video_feed', methods=['POST'])
def video_feed():
    if 'video' not in request.files:
        return jsonify({"success": False, "error": "No video part found in the request."}), 400
    
    video = request.files['video']

    np_array = np.frombuffer(video.read(), np.uint8)
    frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    
    if frame is None or frame.size == 0:
        return jsonify({"success": False, "error": "Empty frame received"}), 400
    
    processed_frame, _ = process_frame(frame)
    
    if processed_frame is None:
        return jsonify({"success": False, "error": "Frame processing failed"}), 400
    
    ret, buffer = cv2.imencode('.jpg', processed_frame)
    frame = buffer.tobytes()

    return Response(frame, mimetype='image/jpeg')

@app.route('/save_bounding_box', methods=['GET'])
def save_bounding_box():
    global current_bounding_boxes
    if current_bounding_boxes:
        with open('bounding_boxes.json', 'w') as f:
            json.dump(current_bounding_boxes, f)
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "No bounding boxes found"})

@app.route('/dashboard')
def dashboard():
    global bounding_boxes
    print("Bounding boxes")
    print(bounding_boxes)
    print("=======================================")
    print()
    print()
    print()
    if bounding_boxes is None:
        try:
            with open('bounding_boxes.json', 'r') as f:
                bounding_boxes = json.load(f)
        except FileNotFoundError:
            bounding_boxes = []  # O maneja este error según lo necesites

    return render_template('dashboard.html')

@app.route('/process_stream', methods=['POST'])
def process_stream():
    if 'frame' not in request.files:
        return jsonify({"success": False, "error": "No frame received"}), 400

    file = request.files['frame']
    npimg = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if bounding_boxes:
        bounding_box = bounding_boxes[0]  
        x1, y1, x2, y2 = bounding_box[0], bounding_box[1], bounding_box[2], bounding_box[3]

        # Recortar la imagen en la región del bounding box
        cropped_img = frame[y1:y2, x1:x2]
        
        # Pasar la imagen recortada al modelo de clasificación
        img = process_cropped_frame(cropped_img)

    if img:
        return send_file(img, mimetype='image/png')
    else:
        return jsonify({"success": False, "error": "Failed to generate dashboard"}), 500

@app.route('/initialize_time', methods=['POST'])
def initialize_time():
    start_times()
    plt.switch_backend('agg')
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
