import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RouteNode {
  id: string;
  name: string;
  x?: number;
  y?: number;
}

export interface RouteLink {
  id: string;
  source: string;
  target: string;
  cost: number;
  active: boolean;
}

interface RoutingState {
  nodes: RouteNode[];
  links: RouteLink[];
  protocol: 'RIP' | 'OSPF';
  isSDN: boolean;
  convergenceStep: number;
}

const initialState: RoutingState = {
  nodes: [
    { id: 'R1', name: 'R1' },
    { id: 'R2', name: 'R2' },
    { id: 'R3', name: 'R3' },
    { id: 'R4', name: 'R4' },
    { id: 'R5', name: 'R5' },
    { id: 'R6', name: 'R6' },
  ],
  links: [
    { id: 'L1', source: 'R1', target: 'R2', cost: 1, active: true },
    { id: 'L2', source: 'R2', target: 'R3', cost: 1, active: true },
    { id: 'L3', source: 'R3', target: 'R4', cost: 1, active: true },
    { id: 'L4', source: 'R4', target: 'R5', cost: 1, active: true },
    { id: 'L5', source: 'R5', target: 'R1', cost: 1, active: true },
    { id: 'L6', source: 'R2', target: 'R4', cost: 5, active: true },
    { id: 'L7', source: 'R3', target: 'R6', cost: 2, active: true },
    { id: 'L8', source: 'R6', target: 'R5', cost: 2, active: true },
  ],
  protocol: 'OSPF',
  isSDN: false,
  convergenceStep: 0,
};

export const routingSlice = createSlice({
  name: 'routing',
  initialState,
  reducers: {
    toggleLink: (state, action: PayloadAction<string>) => {
      const link = state.links.find(l => l.id === action.payload);
      if (link) {
        link.active = !link.active;
        state.convergenceStep = 0; // Reset for recalculation
      }
    },
    setProtocol: (state, action: PayloadAction<'RIP' | 'OSPF'>) => {
      state.protocol = action.payload;
      state.convergenceStep = 0;
    },
    toggleSDN: (state) => {
      state.isSDN = !state.isSDN;
    },
    incrementStep: (state) => {
      state.convergenceStep += 1;
    },
    resetRouting: () => initialState,
  },
});

export const { toggleLink, setProtocol, toggleSDN, incrementStep, resetRouting } = routingSlice.actions;

export default routingSlice.reducer;
