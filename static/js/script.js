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
        const cameraId = document.getElementById('cameraSelect').value;
        sessionStorage.setItem('selectedCameraId', cameraId);

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: cameraId ? { exact: cameraId } : undefined }
        });

        const videoTracks = stream.getVideoTracks();
        const videoTrack = videoTracks[0];

        const imageCapture = new ImageCapture(videoTrack);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        socket.on('connect', () => {
            console.log('Conexión SocketIO establecida');
            processFrame();
        });

        socket.on('processed_frame', (data) => {
            const blob = new Blob([data], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            document.getElementById('videoStream').src = url;
            processFrame();
        });

        socket.on('error', (error) => {
            console.error('Error en el procesamiento:', error);
        });

        socket.on('disconnect', () => {
            console.log('Conexión SocketIO cerrada');
        });

        async function processFrame() {
            try {
                const frame = await imageCapture.grabFrame();
                canvas.width = frame.width;
                canvas.height = frame.height;
                ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    socket.emit('video_feed', blob); // Asegúrate de usar 'video_feed' para coincidir con el backend
                }, 'image/jpeg', 0.7); // Ajusta la calidad según necesidad
            } catch (error) {
                console.error('Error al procesar el frame:', error);
            }
        }

    } catch (error) {
        console.error('Error accediendo a la cámara:', error);
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

getAvailableCameras();
document.getElementById('cameraSelect').addEventListener('change', startStream);
const socket = io.connect('http://127.0.0.1:5000')