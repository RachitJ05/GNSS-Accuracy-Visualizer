let io = null;

export function setSocket(socketServer) {
    io = socketServer;
}

export function broadcastGnss(data) {
    if (!io) return;
    io.emit("gnss", data);
}