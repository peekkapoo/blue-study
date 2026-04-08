import React from 'react';
import SubAppBoundary from '../SubAppBoundary';

export default function LibrarySubApp({ theme = 'light', activeViewKey = 'library', children }) {
  return (
    <SubAppBoundary moduleId="library" theme={theme} resetKey={activeViewKey}>
      {children}
    </SubAppBoundary>
  );
}
