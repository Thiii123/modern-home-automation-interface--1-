import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Power, Lightbulb, Edit2, Check, Tv, Fan, Wifi, WifiOff } from 'lucide-react';
import { cn } from './utils/cn';
import mqtt, { MqttClient } from 'mqtt';

interface Device {
  id: number;
  name: string;
  isOn: boolean;
  icon: 'light' | 'tv' | 'fan';
  topicCommand: string;
  topicStatus: string;
}

// Initial state for 12 devices with MQTT topics
const INITIAL_DEVICES: Device[] = [
  { id: 1, name: 'LED Quarto', isOn: false, icon: 'light', topicCommand: 'casa/quarto/rele', topicStatus: 'casa/quarto/rele/status' },
  { id: 2, name: 'Luz Sala', isOn: false, icon: 'light', topicCommand: 'casa/sala/rele', topicStatus: 'casa/sala/rele/status' },
  { id: 3, name: 'TV Sala', isOn: false, icon: 'tv', topicCommand: 'casa/sala/tv', topicStatus: 'casa/sala/tv/status' },
  { id: 4, name: 'Ventilador', isOn: false, icon: 'fan', topicCommand: 'casa/quarto/ventilador', topicStatus: 'casa/quarto/ventilador/status' },
  { id: 5, name: 'Luz Cozinha', isOn: false, icon: 'light', topicCommand: 'casa/cozinha/rele', topicStatus: 'casa/cozinha/rele/status' },
  { id: 6, name: 'Luz Banheiro', isOn: false, icon: 'light', topicCommand: 'casa/banheiro/rele', topicStatus: 'casa/banheiro/rele/status' },
  { id: 7, name: 'TV Quarto', isOn: false, icon: 'tv', topicCommand: 'casa/quarto/tv', topicStatus: 'casa/quarto/tv/status' },
  { id: 8, name: 'Ar Condicionado', isOn: false, icon: 'fan', topicCommand: 'casa/quarto/ar', topicStatus: 'casa/quarto/ar/status' },
  { id: 9, name: 'Luz Garagem', isOn: false, icon: 'light', topicCommand: 'casa/garagem/rele', topicStatus: 'casa/garagem/rele/status' },
  { id: 10, name: 'Luz Jardim', isOn: false, icon: 'light', topicCommand: 'casa/jardim/rele', topicStatus: 'casa/jardim/rele/status' },
  { id: 11, name: 'Luz Varanda', isOn: false, icon: 'light', topicCommand: 'casa/varanda/rele', topicStatus: 'casa/varanda/rele/status' },
  { id: 12, name: 'Ventilador Sala', isOn: false, icon: 'fan', topicCommand: 'casa/sala/ventilador', topicStatus: 'casa/sala/ventilador/status' },
];

export function App() {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const clientRef = useRef<MqttClient | null>(null);

  // MQTT Connection
  useEffect(() => {
    const broker = 'wss://broker.hivemq.com:8884/mqtt';
    
    const client = mqtt.connect(broker, {
      clientId: `smarthome_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    clientRef.current = client;

    client.on('connect', () => {
      console.log('Conectado ao Broker MQTT! ✅');
      setConnectionStatus('connected');
      
      // Subscribe to all status topics
      devices.forEach(device => {
        client.subscribe(device.topicStatus, (err) => {
          if (err) {
            console.error(`Erro ao subscrever ${device.topicStatus}:`, err);
          }
        });
      });
    });

    client.on('error', (err) => {
      console.error('Erro na conexão MQTT:', err);
      setConnectionStatus('error');
    });

    client.on('close', () => {
      setConnectionStatus('disconnected');
    });

    client.on('reconnect', () => {
      setConnectionStatus('connecting');
    });

    client.on('message', (topic, message) => {
      const estado = message.toString().toUpperCase();
      console.log(`Mensagem recebida - Tópico: ${topic}, Valor: ${estado}`);
      
      setDevices(prev => prev.map(device => {
        if (device.topicStatus === topic) {
          return { ...device, isOn: estado === 'ON' || estado === '1' };
        }
        return device;
      }));
    });

    return () => {
      client.end();
    };
  }, []);

  const sendCommand = useCallback((topic: string, value: string) => {
    if (clientRef.current && clientRef.current.connected) {
      console.log(`Enviando comando: ${topic} = ${value}`);
      clientRef.current.publish(topic, value);
    } else {
      console.error('Cliente MQTT não conectado');
    }
  }, []);

  const toggleDevice = (device: Device, state: boolean) => {
    const command = state ? '1' : '0';
    sendCommand(device.topicCommand, command);
    
    // Optimistic update
    setDevices(prev => prev.map(dev => 
      dev.id === device.id ? { ...dev, isOn: state } : dev
    ));
  };

  const startEditing = (device: Device) => {
    setEditingId(device.id);
    setEditName(device.name);
  };

  const saveName = (id: number) => {
    if (editName.trim()) {
      setDevices(prev => prev.map(dev => 
        dev.id === id ? { ...dev, name: editName } : dev
      ));
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      saveName(id);
    }
    if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'fan': return <Fan className="w-6 h-6" />;
      case 'tv': return <Tv className="w-6 h-6" />;
      default: return <Lightbulb className="w-6 h-6" />;
    }
  };

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Conectado ao Broker ✅', color: 'text-green-400', bgColor: 'bg-green-500', icon: <Wifi className="w-4 h-4" /> };
      case 'connecting':
        return { text: 'Conectando...', color: 'text-yellow-400', bgColor: 'bg-yellow-500', icon: <Wifi className="w-4 h-4 animate-pulse" /> };
      case 'error':
        return { text: 'Erro na Conexão ❌', color: 'text-red-400', bgColor: 'bg-red-500', icon: <WifiOff className="w-4 h-4" /> };
      default:
        return { text: 'Desconectado', color: 'text-slate-400', bgColor: 'bg-slate-500', icon: <WifiOff className="w-4 h-4" /> };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Painel IoT - ESP8266
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              Controle de Automação Residencial via MQTT
            </p>
          </div>
          
          <div className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-full border transition-colors",
            connectionStatus === 'connected' ? 'bg-green-500/10 border-green-500/30' :
            connectionStatus === 'connecting' ? 'bg-yellow-500/10 border-yellow-500/30' :
            connectionStatus === 'error' ? 'bg-red-500/10 border-red-500/30' :
            'bg-slate-900/50 border-slate-800'
          )}>
            <div className={cn("w-2 h-2 rounded-full animate-pulse", statusInfo.bgColor)} />
            {statusInfo.icon}
            <span className={cn("text-xs font-medium", statusInfo.color)}>{statusInfo.text}</span>
          </div>
        </header>

        {/* Broker Info */}
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-400">Broker:</span> wss://broker.hivemq.com:8884/mqtt
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {devices.map((device) => (
            <div 
              key={device.id}
              className={cn(
                "relative group overflow-hidden rounded-2xl border transition-all duration-300",
                device.isOn 
                  ? "bg-slate-900/80 border-cyan-500/50 shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]" 
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
              )}
            >
              {/* Glow Effect Background */}
              {device.isOn && (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 pointer-events-none" />
              )}

              <div className="relative p-5 space-y-4">
                {/* Header: Icon & Edit */}
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "p-3 rounded-xl transition-colors duration-300",
                    device.isOn ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/40" : "bg-slate-800 text-slate-400"
                  )}>
                    {getIcon(device.icon)}
                  </div>
                  
                  {editingId === device.id ? (
                    <button 
                      onClick={() => saveName(device.id)}
                      className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                      title="Salvar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => startEditing(device)}
                      className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Editar Nome"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Name */}
                <div className="h-8 flex items-center">
                  {editingId === device.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, device.id)}
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  ) : (
                    <h3 className="font-semibold text-lg text-slate-100 truncate">
                      {device.name}
                    </h3>
                  )}
                </div>

                {/* Topic Info */}
                <div className="text-[10px] text-slate-600 font-mono truncate">
                  {device.topicCommand}
                </div>

                {/* Status Text */}
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", device.isOn ? "bg-green-400 animate-pulse" : "bg-red-500")} />
                  <span className={cn(
                    "text-sm font-bold uppercase tracking-wider",
                    device.isOn ? "text-green-400" : "text-red-400"
                  )}>
                    {device.isOn ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Control Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => toggleDevice(device, true)}
                    disabled={connectionStatus !== 'connected'}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-bold transition-all duration-200 border-2",
                      device.isOn
                        ? "bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/30"
                        : "bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white hover:shadow-lg hover:shadow-green-500/30",
                      connectionStatus !== 'connected' && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Power className="w-4 h-4" />
                    LIGAR
                  </button>
                  
                  <button
                    onClick={() => toggleDevice(device, false)}
                    disabled={connectionStatus !== 'connected'}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-bold transition-all duration-200 border-2",
                      !device.isOn
                        ? "bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/30"
                        : "bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/30",
                      connectionStatus !== 'connected' && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Power className="w-4 h-4" />
                    DESLIGAR
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-600 text-xs pt-6 border-t border-slate-800">
          <p>Painel IoT - Conectado via WebSocket ao HiveMQ Public Broker</p>
          <p className="mt-1">Comandos: '1' para ligar | '0' para desligar</p>
        </footer>
      </div>
    </div>
  );
}
