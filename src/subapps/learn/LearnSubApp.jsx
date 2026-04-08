import React from 'react';
import SubAppBoundary from '../SubAppBoundary';

export default function LearnSubApp({ theme = 'light', activeViewKey = 'learn', children }) {
  return (
    <SubAppBoundary moduleId="learn" theme={theme} resetKey={activeViewKey}>
      {children}
    </SubAppBoundary>
  );
}
