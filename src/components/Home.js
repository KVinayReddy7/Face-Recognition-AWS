import { useState, useRef } from 'react';
import './../components/Home';
const uuid = require('uuid');

function Home() {
  const [uploadResultMessage, setUploadResultMessage] = useState('Image is Authenticating...');
  const [visitorName, setVisitorName] = useState('placeholder.jpeg');
  const [isAuth, setAuth] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true); // To control camera state
  const [capturedImage, setCapturedImage] = useState(null); // To store the captured image
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true); // Camera is now active
      })
      .catch((err) => {
        console.error('Error accessing camera: ', err);
      });
  };

  const captureImage = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Turn the captured canvas image into a blob
    canvas.toBlob((blob) => {
      const visitorImageName = uuid.v4();
      setVisitorName(`${visitorImageName}.jpeg`);

      // Create a URL for the captured image and stop the camera
      const capturedImageUrl = URL.createObjectURL(blob);
      setCapturedImage(capturedImageUrl);
      setIsCameraActive(false); // Turn off the camera
      sendImageToAWS(blob, visitorImageName);
    }, 'image/jpeg');
  };

  const sendImageToAWS = (imageBlob, visitorImageName) => {
    fetch(`https://48cc83boci.execute-api.us-east-1.amazonaws.com/dev/pjt-visitor-image-storage/${visitorImageName}.jpeg`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: imageBlob,
    })
      .then(async () => {
        const response = await authenticate(visitorImageName);
        if (response.Message === 'Success') {
          setAuth(true);
          setUploadResultMessage(`Hello, ${response['firstName']} ${response['lastName']}, WELCOME.`);
        } else {
          setAuth(false);
          setUploadResultMessage('User NOT Found');
        }
      })
      .catch((error) => {
        setAuth(false);
        setUploadResultMessage('There is an error in the authentication process, try again later.');
        console.error(error);
      });
  };

  async function authenticate(visitorImageName) {
    const requestUrl = `https://48cc83boci.execute-api.us-east-1.amazonaws.com/dev/employee?${new URLSearchParams({
      objectKey: `${visitorImageName}.jpeg`,
    })}`;
    return await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => data)
      .catch((error) => console.error(error));
  }
  const resetState = () => {
    window.location.reload(); // This will reload the entire page
  };
  return (
    <div className="App">
      <div className="container">
        <h2 className="title">IMAGE AUTHENTICATION</h2>

        {/* Show the camera feed if it's active */}
        {isCameraActive ? (
          <>
            <button className="btn start-btn" onClick={startCamera}>Start Camera</button>
            <div className="video-container">
              <video ref={videoRef} className="video-frame" autoPlay width={250} height={250} />
              <canvas ref={canvasRef}/>
            </div>
            <form onSubmit={captureImage} className="capture-form">
              <button className="btn capture-btn" type="submit">Capture & Authenticate</button>
            </form>
          </>
        ) : (
          // Show the captured image if the camera is off
          <div className="image-container">
            <img src={capturedImage} alt="Captured" className="captured-image" />
            <div className={isAuth ? 'auth-message success' : 'auth-message failure'}>
              {uploadResultMessage}
            </div>
          </div>
        )}
        {/* Reset button */}
        <button className="btn reset-btn" onClick={resetState}>Reset</button>
      </div>
    </div>
  );
}

export default Home;