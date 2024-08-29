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
                    await processDashboardFrame();
                }, 'image/jpeg');
            } catch (error) {
                console.error('Error drawing image:', error);
            }
        }

        processDashboardFrame();
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
            video: { 
                deviceId: cameraId ? { exact: cameraId } : undefined,
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
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
        }, 1);
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
