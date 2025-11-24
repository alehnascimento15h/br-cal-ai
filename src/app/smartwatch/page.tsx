'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/custom/Button';
import { ArrowLeft, Watch, Activity, MapPin, Timer, Zap, Heart, TrendingUp } from 'lucide-react';

interface RouteData {
  distance: number;
  duration: number;
  calories: number;
  avgSpeed: number;
  heartRate: number;
  steps: number;
  coordinates: { lat: number; lng: number; timestamp: number }[];
}

export default function SmartwatchPage() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [routeData, setRouteData] = useState<RouteData>({
    distance: 0,
    duration: 0,
    calories: 0,
    avgSpeed: 0,
    heartRate: 0,
    steps: 0,
    coordinates: []
  });
  const [deviceName, setDeviceName] = useState('');

  // Simula conexão com smartwatch
  const connectSmartwatch = async () => {
    // Simula processo de conexão
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsConnected(true);
    setDeviceName('Apple Watch Series 9');
  };

  // Simula rastreamento de percurso
  const startTracking = () => {
    setIsTracking(true);
    
    // Simula atualização de dados em tempo real
    const interval = setInterval(() => {
      setRouteData(prev => ({
        distance: prev.distance + (Math.random() * 0.05),
        duration: prev.duration + 1,
        calories: prev.calories + (Math.random() * 2),
        avgSpeed: 5.2 + (Math.random() * 1.5),
        heartRate: 120 + Math.floor(Math.random() * 20),
        steps: prev.steps + Math.floor(Math.random() * 10),
        coordinates: [
          ...prev.coordinates,
          {
            lat: -23.5505 + (Math.random() * 0.01),
            lng: -46.6333 + (Math.random() * 0.01),
            timestamp: Date.now()
          }
        ]
      }));
    }, 1000);

    return () => clearInterval(interval);
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Smartwatch</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Status de Conexão */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isConnected ? 'bg-green-500/20' : 'bg-gray-500/20'
              }`}>
                <Watch className={`w-8 h-8 ${isConnected ? 'text-green-400' : 'text-gray-400'}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {isConnected ? deviceName : 'Nenhum dispositivo'}
                </h2>
                <p className="text-sm text-gray-300">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
            </div>
            {isConnected && (
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>

          {!isConnected ? (
            <Button
              onClick={connectSmartwatch}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              size="lg"
            >
              Conectar Smartwatch
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-gray-300">Batimentos</span>
                  </div>
                  <p className="text-2xl font-bold">{routeData.heartRate || '--'} bpm</p>
                </div>
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-300">Passos</span>
                  </div>
                  <p className="text-2xl font-bold">{routeData.steps.toLocaleString()}</p>
                </div>
              </div>

              {!isTracking ? (
                <Button
                  onClick={startTracking}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  size="lg"
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  Iniciar Rastreamento
                </Button>
              ) : (
                <Button
                  onClick={stopTracking}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  size="lg"
                >
                  Parar Rastreamento
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Dados do Percurso */}
        {isTracking && (
          <div className="space-y-4 animate-fade-in">
            {/* Mapa Simulado */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl h-64 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
                <div className="relative">
                  <MapPin className="w-16 h-16 text-green-400 animate-pulse" />
                  <div className="absolute -inset-4 bg-green-400/20 rounded-full animate-ping" />
                </div>
              </div>
              <p className="text-center text-sm text-gray-300 mt-4">
                Rastreando sua localização em tempo real
              </p>
            </div>

            {/* Estatísticas em Tempo Real */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-300">Distância</span>
                </div>
                <p className="text-3xl font-bold">{routeData.distance.toFixed(2)} km</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-gray-300">Tempo</span>
                </div>
                <p className="text-3xl font-bold">{formatTime(routeData.duration)}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-gray-300">Calorias</span>
                </div>
                <p className="text-3xl font-bold">{Math.round(routeData.calories)} kcal</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-300">Velocidade</span>
                </div>
                <p className="text-3xl font-bold">{routeData.avgSpeed.toFixed(1)} km/h</p>
              </div>
            </div>
          </div>
        )}

        {/* Histórico de Atividades */}
        {isConnected && !isTracking && routeData.distance > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <h3 className="text-lg font-bold mb-4">Última Atividade</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Distância percorrida</span>
                <span className="font-bold">{routeData.distance.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Tempo total</span>
                <span className="font-bold">{formatTime(routeData.duration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Calorias queimadas</span>
                <span className="font-bold">{Math.round(routeData.calories)} kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Passos totais</span>
                <span className="font-bold">{routeData.steps.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
