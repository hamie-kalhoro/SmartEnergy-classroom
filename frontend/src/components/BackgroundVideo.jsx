import React from 'react';
import videoBg from '../assets/background.mp4';

const BackgroundVideo = () => {
    return (
        <div className='background-video-container'>
            <div className="overlay"></div>
            <video src={videoBg} autoPlay loop muted />
        </div>
    );
};

export default BackgroundVideo;
