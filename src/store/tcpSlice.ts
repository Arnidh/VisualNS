import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TcpStateValue = 
  'CLOSED' | 'LISTEN' | 'SYN_SENT' | 'SYN_RCVD' | 'ESTABLISHED' | 
  'FIN_WAIT_1' | 'FIN_WAIT_2' | 'CLOSE_WAIT' | 'CLOSING' | 'LAST_ACK' | 'TIME_WAIT';

export interface Packet {
  id: string;
  type: string;
  srcPort: number;
  destPort: number;
  seq: number;
  ack?: number;
  size: number;
  status: 'buffered' | 'in_transit' | 'delivered';
}

interface TcpState {
  clientState: TcpStateValue;
  serverState: TcpStateValue;
  clientBuffer: Packet[];
  serverBuffer: Packet[];
  inTransit: Packet[];
  cwnd: number; // Congestion Window
}

const initialState: TcpState = {
  clientState: 'CLOSED',
  serverState: 'LISTEN',
  clientBuffer: [],
  serverBuffer: [],
  inTransit: [],
  cwnd: 1
};

export const tcpSlice = createSlice({
  name: 'tcp',
  initialState,
  reducers: {
    setClientState: (state, action: PayloadAction<TcpStateValue>) => {
      state.clientState = action.payload;
    },
    setServerState: (state, action: PayloadAction<TcpStateValue>) => {
      state.serverState = action.payload;
    },
    bufferPacket: (state, action: PayloadAction<{ target: 'client' | 'server', packet: Packet }>) => {
      if (action.payload.target === 'client') {
        state.clientBuffer.push(action.payload.packet);
      } else {
        state.serverBuffer.push(action.payload.packet);
      }
    },
    sendPackets: (state, action: PayloadAction<{ from: 'client' | 'server' }>) => {
      const buffer = action.payload.from === 'client' ? state.clientBuffer : state.serverBuffer;
      const toSend = buffer.splice(0, state.cwnd);
      toSend.forEach(p => p.status = 'in_transit');
      state.inTransit.push(...toSend);
    },
    deliverPacket: (state, action: PayloadAction<{ id: string, target: 'client' | 'server' }>) => {
      const pkt = state.inTransit.find(p => p.id === action.payload.id);
      if (pkt) {
        pkt.status = 'delivered';
        if (action.payload.target === 'client') {
            state.clientBuffer.push(pkt); // For visualization, keep delivered packets in buffer briefly
        } else {
            state.serverBuffer.push(pkt);
        }
        state.inTransit = state.inTransit.filter(p => p.id !== action.payload.id);
      }
    },
    resetTcp: () => initialState,
  },
});

export const { setClientState, setServerState, bufferPacket, sendPackets, deliverPacket, resetTcp } = tcpSlice.actions;

export default tcpSlice.reducer;
