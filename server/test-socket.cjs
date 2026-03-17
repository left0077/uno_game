const { io } = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected');
  
  socket.emit('create-room', { nickname: '测试' }, (res) => {
    console.log('Create:', res.success, res.room?.code);
    if (res.success) {
      const code = res.room.code;
      const userId = res.userId;
      socket.emit('auth', { userId, nickname: '测试' });
      
      setTimeout(() => {
        socket.emit('add-ai', { roomCode: code, difficulty: 'easy' }, (res2) => {
          console.log('Add AI:', res2.success);
          
          setTimeout(() => {
            console.log('Starting game...');
            socket.emit('game:start', { roomCode: code }, (res3) => {
              console.log('Start:', res3);
              socket.close();
            });
          }, 500);
        });
      }, 500);
    }
  });
});

setTimeout(() => {
  console.log('Timeout');
  socket.close();
}, 15000);
