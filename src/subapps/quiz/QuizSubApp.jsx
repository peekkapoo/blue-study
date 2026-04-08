import React from 'react';
import MultipleChoicesLab from '../../MultipleChoicesLab';
import SubAppBoundary from '../SubAppBoundary';

export default function QuizSubApp({ theme = 'light', activeViewKey = 'quiz', data, onChange }) {
  return (
    <SubAppBoundary moduleId="quiz" theme={theme} resetKey={activeViewKey}>
      <MultipleChoicesLab data={data} onChange={onChange} theme={theme} />
    </SubAppBoundary>
  );
}
