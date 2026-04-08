import React from 'react';
import SubAppBoundary from '../SubAppBoundary';

export default function TodaySubApp({ theme = 'light', activeViewKey = 'today', children }) {
  return (
    <SubAppBoundary moduleId="today" theme={theme} resetKey={activeViewKey}>
      {children}
    </SubAppBoundary>
  );
}
