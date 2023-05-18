'use strict';
const toggle_buttons = document.querySelectorAll('.availability-toggle-button');
toggle_buttons.forEach(button => {
  button.addEventListener('click', async () => {
    const scheduleId = button.getAttribute('data-schedule-id');
    const userId = button.getAttribute('data-user-id');
    const candidateId = button.getAttribute('data-candidate-id');
    const availability = parseInt(button.getAttribute('data-availability'));
    const nextAvailability = (availability + 1) % 3;
    const url = `/schedules/${scheduleId}/users/${userId}/candidates/${candidateId}`;
    const data = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: nextAvailability })
    }).then(response => {
      if (!response.ok) {
        throw new Error();
      }
      return response.json();
    });
    button.setAttribute('data-availability', data.availability);
    const availabilityLabels = ['欠', '？', '出'];
    button.textContent = availabilityLabels[data.availability];
  });
});

const buttonSelfComment = document.querySelector('#self-comment-button');
buttonSelfComment.addEventListener('click', async () => {
  const scheduleId = buttonSelfComment.getAttribute('data-schedule-id');
  const userId = buttonSelfComment.getAttribute('data-user-id');
  const comment = prompt('コメントを255文字以内で入力してください。');
  if (comment) {
    const url = `/schedules/${scheduleId}/users/${userId}/comments`;
    const data = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: comment })
    }).then(response => {
      if (!response.ok) {
        throw new Error();
      }
      return response.json();
    });
    document.querySelector('#self-comment').textContent = data.comment;
  }
});