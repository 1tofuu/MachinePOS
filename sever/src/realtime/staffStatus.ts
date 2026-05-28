import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { staffLoginHistory, users } from "../db/schema.js";

let io: Server | null = null;

export function initializeStaffStatusSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.emit("staff:status:list", getStaffStatusSnapshot());
  });

  return io;
}

export function emitStaffStatusChanged() {
  io?.emit("staff:status:list", getStaffStatusSnapshot());
}

export function getStaffStatusSnapshot() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      hireDate: users.hireDate,
    })
    .from(users)
    .all();
}

export function getStaffLoginHistory() {
  return db
    .select({
      id: staffLoginHistory.id,
      userId: staffLoginHistory.userId,
      loginTime: staffLoginHistory.loginTime,
      logoutTime: staffLoginHistory.logoutTime,
      status: staffLoginHistory.status,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(staffLoginHistory)
    .leftJoin(users, eq(staffLoginHistory.userId, users.id))
    .all();
}
