async function getAvailableCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error("enumerateDevices is not supported.");
        alert("Your browser does not support accessing cameras.");
        return;
    }

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const cameraSelect = document.getElementById('cameraSelect');
        
        cameraSelect.innerHTML = '';

        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${cameraSelect.length + 1}`;
            cameraSelect.appendChild(option);
        });

        // Seleccionar la cámara previamente seleccionada, si existe
        const selectedCameraId = sessionStorage.getItem('selectedCameraId');
        if (selectedCameraId) {
            cameraSelect.value = selectedCameraId;
        }
    } catch (error) {
        console.error('Error accessing devices:', error);
        alert('Error accessing cameras.');
    }
}


async function startStream() {
    try {
        var cameraId = document.getElementById('cameraSelect').value;
        sessionStorage.setItem('selectedCameraId', cameraId);

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: cameraId ? { exact: cameraId } : undefined }
        });

        const videoTracks = stream.getVideoTracks();
        const videoTrack = videoTracks[0];

        const imageCapture = new ImageCapture(videoTrack);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        async function processFrame() {
            try {
                const frame = await imageCapture.grabFrame();
                canvas.width = frame.width;
                canvas.height = frame.height; 
                ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(async (blob) => {
                    await sendVideoStream(blob);
                    await processFrame();
                }, 'image/jpeg');
            } catch (error) {
                console.error('Error drawing image:', error);
            }
        }

        processFrame();
    } catch (error) {
        console.error('Error accessing the camera:', error);
    }
}

async function sendVideoStream(imageBlob) {
    const formData = new FormData();
    formData.append('video', imageBlob);

    try {
        const response = await fetch('/video_feed', {
            method: 'POST',
            body: formData
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        document.getElementById('videoStream').src = url;
    } catch (error) {
        console.error('Failed to send video stream:', error);
    }
}


function showMessage(message) {
    var messageDiv = document.getElementById('message');
    messageDiv.innerText = message;
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

function Dashboard() {
    fetch('/save_bounding_box')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage("Bounding box guardado correctamente");
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            } else {
                showMessage("Error, es necesario reconocer un stack-light por lo menos");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage("Error al guardar el bounding box");
        });
}


async function startDashboardStream() {
    try {
        var cameraId = document.getElementById('cameraSelect').value;
        sessionStorage.setItem('selectedCameraId', cameraId);

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: cameraId ? { exact: cameraId } : undefined }
        });

        const videoTracks = stream.getVideoTracks();
        const videoTrack = videoTracks[0];

        const imageCapture = new ImageCapture(videoTrack);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        async function processDashboardFrame() {
            try {
                const frame = await imageCapture.grabFrame();
                canvas.width = frame.width;
                canvas.height = frame.height; 
                ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(async (blob) => {
                    await sendDashboardStream(blob);
                    await processDashboardFrame();  // Procesar el siguiente frame solo después de recibir la respuesta
                }, 'image/jpeg');
            } catch (error) {
                console.error('Error drawing image:', error);
            }
        }

        processDashboardFrame();  // Iniciar la cadena de procesamiento de frames
    } catch (error) {
        console.error('Error accessing the camera:', error);
    }
}

async function sendDashboardStream(imageBlob) {
    const formData = new FormData();
    formData.append('frame', imageBlob);

    try {
        const response = await fetch('/process_stream', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            document.getElementById('dashboardImage').src = url;
            console.log('Frame processed and dashboard updated successfully');
        } else {
            console.error('Frame processing failed:', await response.json());
        }
    } catch (error) {
        console.error('Failed to send frame:', error);
    }
}

async function Stream() {
    try {
        const cameraId = document.getElementById('cameraSelect').value;
        sessionStorage.setItem('selectedCameraId', cameraId);

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: cameraId ? { exact: cameraId } : undefined }
        });

        const videoTracks = stream.getVideoTracks();
        const videoTrack = videoTracks[0];

        const imageCapture = new ImageCapture(videoTrack);

        setInterval(async () => {
            try {
                const frame = await imageCapture.grabFrame();

                // Enviar el frame original al backend
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = frame.width;
                canvas.height = frame.height;
                ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(async (blob) => {
                    await sendOriginalFrame(blob);
                }, 'image/jpeg');

            } catch (error) {
                console.error('Error capturing frame:', error);
            }
        }, 50);
    } catch (error) {
        console.error('Error accessing the camera:', error);
    }
}

async function sendOriginalFrame(imageBlob) {
    const formData = new FormData();
    formData.append('frame', imageBlob);

    try {
        const response = await fetch('/process_stream', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            console.error('Failed to send original frame to process_stream:', await response.text());
        }
    } catch (error) {
        console.error('Failed to send original frame:', error);
    }
}

getAvailableCameras();
document.getElementById('cameraSelect').addEventListener('change', () => {
    startStream();
});
const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'image/jpeg'
});
