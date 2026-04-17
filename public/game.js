const socket = io();

document.addEventListener("keydown", (e) => {
    if (e.key === "w") socket.emit("move", { x: 0, y: -5 });
    if (e.key === "s") socket.emit("move", { x: 0, y: 5 });
    if (e.key === "a") socket.emit("move", { x: -5, y: 0 });
    if (e.key === "d") socket.emit("move", { x: 5, y: 0 });
});
