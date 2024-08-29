import cv2
from ultralytics import YOLO
import torch
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Carga el modelo YOLO una vez
#model = YOLO('C://luis//camara//yolo_exp1//runs//detect//train62//weights//best.pt')
#model = YOLO('C://luis//camara//yolo_stack_light_model//runs//detect//train5322//weights//best.pt')
#model = YOLO("C://luis//camara//yolo_stack_light_model//runs//detect//train532//weights//best.pt")
model = YOLO('C://luis//camara//yolo_final_dataset//runs//detect//train3//weights//best.pt')

def process_image(frame):
    
    
    
    #================================#
    #           Inference            #
    #================================#
    
    results = model(frame, conf=0.6, iou=0.7)

    
    # Obtén el primer resultado
    r = results[0]
    
    # Dibuja las predicciones en el frame
    processed_frame = r.plot()  # Esto devuelve una imagen con las predicciones dibujadas
    
    return processed_frame
    #================================#
    #          Add bounding boxes    #
    #================================#
    #TODO
    #================================#
    #Display image with bounding box #
    #================================#
    #TODO
    
    return frame