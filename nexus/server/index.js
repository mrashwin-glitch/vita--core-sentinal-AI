const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── In-Memory State ─────────────────────────────────────────────────────────
const users = new Map();       // socketId → user object
const dmMessages = new Map();  // "a-b" → message[]
let msgId = 1000;

const channels = {
  general:   { id: 'general',   name: '# general',   icon: '📡', description: 'Main coordination channel', messages: [] },
  emergency: { id: 'emergency', name: '# emergency',  icon: '🚨', description: 'SOS and emergency alerts',  messages: [] },
  supplies:  { id: 'supplies',  name: '# supplies',   icon: '📦', description: 'Food, water & resources',   messages: [] },
  medical:   { id: 'medical',   name: '# medical',    icon: '🏥', description: 'Medical assistance needed',  messages: [] },
  shelter:   { id: 'shelter',   name: '# shelter',    icon: '🏠', description: 'Safe locations & shelter',   messages: [] },
};

// Pre-seed with atmosphere messages
const seedMessages = [
  { ch: 'general',   user: 'NEXUS·SYS', text: 'NEXUS mesh network initialized. All legacy digital communications confirmed offline. Quantum relay active.', type: 'system', ts: Date.now() - 7200000 },
  { ch: 'general',   user: 'NEXUS·SYS', text: 'Peer-to-peer mesh established across 247 relay nodes. Signal strength: NOMINAL.', type: 'system', ts: Date.now() - 7180000 },
  { ch: 'general',   user: 'Alpha·7',   text: 'Is anyone getting this? Downtown comms tower is dead. NEXUS is the only thing still working.', type: 'message', ts: Date.now() - 6900000 },
  { ch: 'general',   user: 'Theta·3',   text: 'Copy that Alpha. Relay node at central station is holding. Spread the word — NEXUS mesh on 2.4GHz band.', type: 'message', ts: Date.now() - 6800000 },
  { ch: 'general',   user: 'Omega·1',   text: 'Confirmed. 247 nodes online. Government emergency band is silent. We\'re it.', type: 'message', ts: Date.now() - 6700000 },
  { ch: 'general',   user: 'Zeta·2',    text: 'Anyone near the harbor? Strange lights reported. Stay away from open water.', type: 'message', ts: Date.now() - 5400000 },
  { ch: 'general',   user: 'Delta·9',   text: 'Confirmed sighting at harbor. They\'re not hostile — just... watching. Keep calm.', type: 'message', ts: Date.now() - 5000000 },
  { ch: 'emergency', user: 'NEXUS·SYS', text: '⚠ EMERGENCY CHANNEL ACTIVE. Priority transmissions only. All SOS broadcasts monitored.', type: 'system', ts: Date.now() - 7200000 },
  { ch: 'emergency', user: 'Sigma·5',   text: '🆘 SOS — Sector 7 downtown. Building partial collapse. Need medical team and structural engineers. 12 trapped.', type: 'emergency', ts: Date.now() - 3600000 },
  { ch: 'emergency', user: 'Kappa·11',  text: 'Response team dispatched to Sector 7. ETA 20 minutes via surface route.', type: 'message', ts: Date.now() - 3500000 },
  { ch: 'supplies',  user: 'NEXUS·SYS', text: 'Use this channel to coordinate supply distribution across survivor groups.', type: 'system', ts: Date.now() - 7200000 },
  { ch: 'supplies',  user: 'Beta·9',    text: 'Central park water supply still operational. Clean water for ~500 people/day. Come before sunset.', type: 'message', ts: Date.now() - 3000000 },
  { ch: 'supplies',  user: 'Gamma·4',   text: 'Food depot at old warehouse district — Grid ref: N47°W122°. Enough for 3 days.', type: 'message', ts: Date.now() - 2700000 },
  { ch: 'medical',   user: 'NEXUS·SYS', text: 'Medical coordination channel. Post your location and needs.', type: 'system', ts: Date.now() - 7200000 },
  { ch: 'medical',   user: 'Dr·Priya',  text: 'Field clinic set up at Lincoln Elementary. Treating injuries. No power but have supplies. Come if you need help.', type: 'message', ts: Date.now() - 4000000 },
  { ch: 'shelter',   user: 'NEXUS·SYS', text: 'Post safe shelter locations and capacity here.', type: 'system', ts: Date.now() - 7200000 },
  { ch: 'shelter',   user: 'Echo·6',    text: 'Community center on 5th Ave open. 200 person capacity. Generator running. SAFE.', type: 'message', ts: Date.now() - 5500000 },
];

seedMessages.forEach(({ ch, user, text, type, ts }) => {
  channels[ch].messages.push({ id: msgId++, user, text, timestamp: ts, type: type || 'message' });
});

// ─── Socket.io Events ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[NEXUS] Node connected: ${socket.id}`);

  // ── Join / Register
  socket.on('join', ({ callsign, sector }) => {
    if (!callsign || callsign.trim() === '') return;

    const user = {
      id: socket.id,
      callsign: callsign.trim(),
      sector: sector || 'Unknown',
      joinedAt: Date.now(),
      status: 'active',
      nodeId: `N-${Math.floor(Math.random() * 9000) + 1000}`
    };
    users.set(socket.id, user);
    socket.callsign = callsign;

    // Join all channel rooms
    Object.keys(channels).forEach(ch => socket.join(ch));

    // Send init payload
    socket.emit('init', {
      user,
      channels: Object.values(channels).map(({ id, name, icon, description, messages }) => ({
        id, name, icon, description, messageCount: messages.length
      })),
      users: Array.from(users.values()),
      history: Object.fromEntries(
        Object.entries(channels).map(([id, ch]) => [id, ch.messages.slice(-100)])
      )
    });

    // Notify everyone
    io.emit('userList', Array.from(users.values()));

    const joinMsg = {
      id: msgId++,
      user: 'NEXUS·SYS',
      text: `Node [${callsign}] (${user.nodeId}) joined the mesh. Sector: ${sector || 'Unknown'}.`,
      timestamp: Date.now(),
      type: 'system'
    };
    channels.general.messages.push(joinMsg);
    io.to('general').emit('message', { channelId: 'general', message: joinMsg });
    socket.broadcast.emit('userJoined', user);
  });

  // ── Channel Message
  socket.on('sendMessage', ({ channelId, text }) => {
    const user = users.get(socket.id);
    if (!user || !text?.trim() || !channels[channelId]) return;

    const message = {
      id: msgId++,
      user: user.callsign,
      nodeId: user.nodeId,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'message'
    };
    channels[channelId].messages.push(message);
    io.to(channelId).emit('message', { channelId, message });
  });

  // ── Emergency Broadcast
  socket.on('emergencyBroadcast', ({ text, location, severity }) => {
    const user = users.get(socket.id);
    if (!user || !text?.trim()) return;

    const alert = {
      id: msgId++,
      user: user.callsign,
      nodeId: user.nodeId,
      text: text.trim(),
      location: location || user.sector,
      severity: severity || 'HIGH',
      timestamp: Date.now(),
      type: 'emergency'
    };
    channels.emergency.messages.push(alert);
    io.emit('emergencyAlert', alert);            // Global alert to all
    io.to('emergency').emit('message', { channelId: 'emergency', message: alert });
  });

  // ── Typing Indicator
  socket.on('typing', ({ channelId, isTyping }) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.to(channelId).emit('userTyping', { channelId, callsign: user.callsign, isTyping });
  });

  // ── Direct Message
  socket.on('sendDM', ({ toCallsign, text }) => {
    const fromUser = users.get(socket.id);
    if (!fromUser || !text?.trim()) return;

    const message = {
      id: msgId++,
      from: fromUser.callsign,
      to: toCallsign,
      text: text.trim(),
      timestamp: Date.now(),
      encrypted: true
    };

    const toEntry = Array.from(users.entries()).find(([, u]) => u.callsign === toCallsign);
    socket.emit('dmMessage', message);
    if (toEntry) io.to(toEntry[0]).emit('dmMessage', message);
  });

  // ── Disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (!user) return;
    users.delete(socket.id);
    io.emit('userList', Array.from(users.values()));
    io.emit('userLeft', { callsign: user.callsign });

    const leaveMsg = {
      id: msgId++,
      user: 'NEXUS·SYS',
      text: `Node [${user.callsign}] (${user.nodeId}) lost signal.`,
      timestamp: Date.now(),
      type: 'system'
    };
    channels.general.messages.push(leaveMsg);
    io.to('general').emit('message', { channelId: 'general', message: leaveMsg });
    console.log(`[NEXUS] Node disconnected: ${user.callsign}`);
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'NEXUS_ONLINE', nodes: users.size, uptime: process.uptime() }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n ██████╗ ██╗   ██╗███████╗██╗  ██╗███████╗`);
  console.log(` ██╔══██╗╚██╗ ██╔╝██╔════╝╚██╗██╔╝██╔════╝`);
  console.log(` ██████╔╝ ╚████╔╝ █████╗   ╚███╔╝ ███████╗`);
  console.log(` ██╔═══╝   ╚██╔╝  ██╔══╝   ██╔██╗ ╚════██║`);
  console.log(` ██║        ██║   ███████╗██╔╝ ██╗███████║`);
  console.log(` ╚═╝        ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝`);
  console.log(`\n NEXUS mesh server live on port ${PORT}`);
  console.log(` ${Object.keys(channels).length} channels initialized`);
  console.log(` ${seedMessages.length} seed messages loaded\n`);
});
