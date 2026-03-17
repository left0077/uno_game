import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  socket.emit('create-room', { nickname: '测试玩家' }, (response) => {
    console.log('Create room:', response.success ? 'OK' : 'FAIL', response.error || '');
    
    if (response.success) {
      const { roomCode } = response;
      
      socket.emit('add-ai', { roomCode, difficulty: 'easy' }, (addAIResponse) => {
        console.log('Add AI:', addAIResponse.success ? 'OK' : 'FAIL', addAIResponse.error || '');
        
        socket.emit('start-game', { roomCode }, (startResponse) => {
          console.log('Start game:', startResponse.success ? 'OK' : 'FAIL', startResponse.error || '');
          if (!startResponse.success) {
            console.log('Error details:', startResponse);
          }
          socket.disconnect();
        });
      });
    }
  });
});

socket.on('error', (err) => console.error('Error:', err));

setTimeout(() => {
  console.log('Timeout');
  socket.disconnect();
}, 10000);
