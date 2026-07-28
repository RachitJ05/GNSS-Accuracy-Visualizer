import { Server } from "socket.io";
import { setSocket } from "../services/broadcaster.js";
import { updateMode, getGnssData } from "../services/gnssService.js";

export default function initializeSocket(server){

    const io = new Server(server,{
        cors:{
            origin: process.env.FRONTEND_URL
        }
    });

    setSocket(io);

    io.on("connection",(socket)=>{
        console.log("Frontend Connected");

        socket.on("change-mode",(mode)=>{
            updateMode(mode);
            const data = getGnssData();
            io.emit("gnss",data);
        });
    });
}