import React from 'react';
import SubAppBoundary from '../SubAppBoundary';

export default function PlanSubApp({ theme = 'light', activeViewKey = 'plan', children }) {
  return (
    <SubAppBoundary moduleId="plan" theme={theme} resetKey={activeViewKey}>
      {children}
    </SubAppBoundary>
  );
}
