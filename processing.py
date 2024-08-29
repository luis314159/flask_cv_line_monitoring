import cv2
import torch
import matplotlib.pyplot as plt
import cv2
from ultralytics import YOLO
import torch
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
from torchvision import transforms
import torchvision.models as models
import torch.nn as nn
import numpy as np
from PIL import Image
import os
import io
from flask import send_file


shufflenet_path = "C://luis//camara//torch_fix//trained_models//model7.pth"
yolo_model = YOLO('C://luis//camara//yolo_final_dataset//runs//detect//train3//weights//best.pt')
# Setup device agnostic code
device = "cuda" if torch.cuda.is_available() else "cpu"

CONF = 0.5
IOU = 0.6

import json
import matplotlib.pyplot as plt

import json
import matplotlib.pyplot as plt
import time

# Inicializamos el diccionario para almacenar el tiempo en cada estado
time_in_each_state = {
    "Green": 0,
    "Red": 0,
    "Yellow": 0,
    "Blue": 0,
    "None": 0
}


def start_times():
    global last_time
    last_time = time.time()
    
total_time = 0
last_state = None
last_time = time.time()

def build_model(pretrained=True, fine_tune=True):
    if pretrained:
        print('[INFO]: Loading pre-trained weights')
    elif not pretrained:
        print('[INFO]: Not loading pre-trained weights')
    model = models.shufflenet_v2_x2_0(pretrained=pretrained)
    if fine_tune:
        print('[INFO]: Fine-tuning all layers...')
        for params in model.parameters():
            params.requires_grad = True
    elif not fine_tune:
        print('[INFO]: Freezing hidden layers...')
        for params in model.parameters():
            params.requires_grad = False

    # Cambia la última capa de clasificación a 5 clases
    model.fc = nn.Linear(2048, 5)
    return model

shufflenet = build_model(pretrained=False, fine_tune=True)
shufflenet.load_state_dict(torch.load(shufflenet_path))
shufflenet.eval()
shufflenet.to('cuda')

import torchvision.models as models

transform = transforms.Compose([
    transforms.Resize((224,224)),
    #transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# Diccionario para mapear la clase predicha a un nombre de clase
class_names_dict = {
    0: 'Blue',
    1: 'Green',
    2: 'None',
    3: 'Red',
    4: 'Yellow'
}

def classification_model(cropped_img):
    # Asegúrate de que cropped_img sea un array de NumPy
    if isinstance(cropped_img, np.ndarray):
        # Convertir el array NumPy a una imagen PIL
        cropped_img = Image.fromarray(cropped_img)
    
    # Aplicar la transformación a la imagen recortada
    transformed_img = transform(cropped_img) 
    
    # Asegurarse de que la imagen transformada tenga la dimensión del batch
    transformed_img = transformed_img.unsqueeze(0)
    
    # Pasar la imagen transformada al modelo de clasificación
    shufflenet.eval()  # Asegurarse de que el modelo esté en modo de evaluación
    with torch.no_grad():
        transformed_img = transformed_img.to(device)
        output = shufflenet(transformed_img)
        predicted_class_idx = torch.argmax(output, dim=1).item()
    
    # Mapear el índice de la clase a un nombre de clase
    return class_names_dict.get(predicted_class_idx, 'Unknown')

def plot_frame_with_classification(frame, target_label):
    # Convertir el frame a RGB
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Hacer la inferencia con el modelo YOLO
    results = yolo_model(frame_rgb, conf=CONF, iou=IOU)
    
    # Obtener los nombres de las clases del modelo YOLO
    class_names = yolo_model.names

    label_found = False  # Variable para rastrear si se encontró el target_label
    
    bounding_boxes = []

    for box in results[0].boxes:
        cls = int(box.cls.item())
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        
        if class_names[cls] == target_label:
            label_found = True  # Se encontró el target_label

            # Recortar la imagen en la región del bounding box
            cropped_img = frame_rgb[y1:y2, x1:x2]
            
            # Pasar la imagen recortada al modelo de clasificación
            predicted_class = classification_model(cropped_img)
            
            # Añadir la etiqueta de la clasificación a la imagen original
            label = f'{predicted_class}'
            cv2.rectangle(frame_rgb, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame_rgb, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)
            
            # Guardar la información del bounding box
            bounding_boxes.append(
                [x1, y1, x2, y2]
            )

        else:
            # Dibujar el bounding box con la etiqueta original
            original_label = class_names[cls]
            cv2.rectangle(frame_rgb, (x1, y1), (x2, y2), (255, 0, 0), 2)
            cv2.putText(frame_rgb, original_label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    if not label_found:
        print(f"No {target_label} found in the frame.")
    
    # Convertir de vuelta a BGR para mostrar usando OpenCV o guardar la imagen
    frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
    
    return frame_bgr, bounding_boxes

def process_cropped_frame(cropped_frame):
    global total_time
    global time_in_each_state
    cropped_frame = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2RGB)

    color = classification_model(cropped_frame)
    # Actualizar el tiempo en cada estado
    update_state_times(color)
    
    # Calcular la eficiencia
    efficiency = time_in_each_state["Green"] / total_time if total_time > 0 else 0
    
    # Generar el gráfico actualizado y devolverlo
    return generate_dashboard(efficiency)

def update_state_times(current_state):
    global last_state, last_time, total_time
    
    current_time = time.time()
    elapsed_time = current_time - last_time
    last_time = current_time
    
    if last_state is not None:
        time_in_each_state[last_state] += elapsed_time
        total_time += elapsed_time
    
    last_state = current_state

def generate_dashboard(efficiency):
    global total_time
    global time_in_each_state
    try:
        states = list(time_in_each_state.keys())
        times = [value / total_time for value in time_in_each_state.values()]
        
        plt.figure(figsize=(10, 6))
        plt.bar(states, times, color=['green', 'red', 'yellow', 'blue', 'gray'])
        plt.xlabel('State')
        plt.ylabel('Percentage %')
        plt.title(f'State Duration and Efficiency (Green Efficiency: {efficiency:.2%})')

        # Guardar el gráfico en un objeto en memoria
        img = io.BytesIO()
        plt.savefig(img, format='png')
        img.seek(0)  # Mover el puntero al principio del archivo
        plt.close()
        print("Dashboard updated.")

        return img

    except Exception as e:
        print(f"Error generating dashboard: {e}")
        return None


