'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/custom/Button';
import { Camera, Plus, TrendingUp, Utensils, Dumbbell, User, Target, Zap, Droplet, Image as ImageIcon, Loader2, Play, Square, MapPin, Check, Info, AlertCircle, X, Sparkles, Navigation, Activity } from 'lucide-react';

interface Meal {
  id?: string;
  name: string;
  calories: number;
  time: string;
  icon: string;
  meal_type?: string;
}

interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface AnalysisResult {
  calories: number;
  description: string;
  imageUrl: string;
  foods?: string[];
  portions?: string;
  confidence?: string;
  sources?: string;
}

interface ActivitySession {
  id: string;
  startTime: number;
  endTime?: number;
  distance: number;
  duration: number;
  caloriesBurned: number;
  avgSpeed: number;
  locations: Location[];
}

export default function HomePage() {
  const router = useRouter();
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [caloriesGoal, setCaloriesGoal] = useState(2000);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [userName, setUserName] = useState('');
  const [waterConsumed, setWaterConsumed] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAnalysisResult, setShowAnalysisResult] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Estados para rastreamento de atividade física
  const [isTracking, setIsTracking] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activitySessions, setActivitySessions] = useState<ActivitySession[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados do usuário
  useEffect(() => {
    loadUserData();
  }, []);

  // Carregar sessões de atividade salvas
  useEffect(() => {
    const savedSessions = localStorage.getItem('activitySessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      setActivitySessions(sessions);
      
      // Calcular distância total e calorias queimadas
      const total = sessions.reduce((sum: number, session: ActivitySession) => sum + session.distance, 0);
      const totalCalories = sessions.reduce((sum: number, session: ActivitySession) => sum + session.caloriesBurned, 0);
      setTotalDistance(total);
      setCaloriesBurned(totalCalories);
    }
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Verificar se existe perfil no localStorage
      const profile = localStorage.getItem('userProfile');
      if (!profile) {
        router.push('/');
        return;
      }

      const userData = JSON.parse(profile);
      setUserName(userData.name);
      setCaloriesGoal(userData.caloriesGoal || 2000);
      
      if (userData.weight) {
        setWaterGoal(userData.weight * 35);
      }

      // Carregar refeições do localStorage
      const savedMeals = localStorage.getItem('meals');
      if (savedMeals) {
        const mealsData = JSON.parse(savedMeals);
        setMeals(mealsData);
        
        // Calcular calorias consumidas
        const totalCalories = mealsData.reduce((sum: number, meal: Meal) => sum + meal.calories, 0);
        setCaloriesConsumed(totalCalories);
      }

      // Carregar água do localStorage
      const savedWater = localStorage.getItem('waterConsumed');
      if (savedWater) {
        setWaterConsumed(parseInt(savedWater));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular distância entre dois pontos (Fórmula de Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distância em km
  };

  // Calcular calorias queimadas baseado em distância e peso
  const calculateCaloriesBurned = (distanceKm: number, weightKg: number = 70): number => {
    // Fórmula aproximada: 1 km de caminhada = ~0.57 * peso em kg
    // 1 km de corrida = ~1.03 * peso em kg
    // Usando média para atividade geral
    return Math.round(distanceKm * 0.8 * weightKg);
  };

  // Iniciar rastreamento
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('❌ Geolocalização não suportada pelo seu navegador');
      return;
    }

    // Solicitar permissão de localização
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Permissão concedida - iniciar rastreamento
        setIsTracking(true);
        setCurrentDistance(0);
        setCurrentDuration(0);
        setLocations([]);
        startTimeRef.current = Date.now();

        // Adicionar primeira localização
        const firstLocation: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
        };
        setLocations([firstLocation]);

        // Iniciar rastreamento contínuo de posição
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation: Location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: Date.now(),
            };

            setLocations((prev) => {
              const updated = [...prev, newLocation];
              
              // Calcular distância se houver localização anterior
              if (prev.length > 0) {
                const lastLocation = prev[prev.length - 1];
                const distance = calculateDistance(
                  lastLocation.latitude,
                  lastLocation.longitude,
                  newLocation.latitude,
                  newLocation.longitude
                );
                
                setCurrentDistance((prevDist) => prevDist + distance);
              }
              
              return updated;
            });
          },
          (error) => {
            console.error('Erro ao obter localização:', error);
            alert('❌ Erro ao acessar localização. Verifique as permissões.');
            stopTracking();
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );

        // Atualizar duração a cada segundo
        intervalRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setCurrentDuration(elapsed);
          
          // Calcular velocidade média (km/h)
          if (elapsed > 0) {
            setCurrentSpeed((prevDistance) => {
              return (prevDistance / elapsed) * 3600;
            });
          }
        }, 1000);

        console.log('✅ Rastreamento iniciado com sucesso!');
      },
      (error) => {
        // Permissão negada ou erro
        console.error('Erro ao solicitar permissão:', error);
        
        let errorMessage = '❌ Não foi possível acessar sua localização.\n\n';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += '🔒 Permissão negada. Por favor, permita o acesso à localização nas configurações do navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += '📍 Localização indisponível. Verifique se o GPS está ativado.';
            break;
          case error.TIMEOUT:
            errorMessage += '⏱️ Tempo esgotado ao tentar obter localização. Tente novamente.';
            break;
          default:
            errorMessage += '❓ Erro desconhecido ao acessar localização.';
        }
        
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Parar rastreamento
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Salvar sessão
    if (currentDistance > 0) {
      const profile = localStorage.getItem('userProfile');
      const weight = profile ? JSON.parse(profile).weight : 70;
      
      const session: ActivitySession = {
        id: Date.now().toString(),
        startTime: startTimeRef.current,
        endTime: Date.now(),
        distance: currentDistance,
        duration: currentDuration,
        caloriesBurned: calculateCaloriesBurned(currentDistance, weight),
        avgSpeed: currentSpeed,
        locations: locations,
      };

      const updatedSessions = [...activitySessions, session];
      setActivitySessions(updatedSessions);
      localStorage.setItem('activitySessions', JSON.stringify(updatedSessions));

      // Atualizar totais
      setTotalDistance((prev) => prev + currentDistance);
      setCaloriesBurned((prev) => prev + session.caloriesBurned);

      alert(`✅ Atividade salva!

📍 Distância: ${currentDistance.toFixed(2)} km
⏱️ Duração: ${formatDuration(currentDuration)}
🔥 Calorias: ${session.caloriesBurned} kcal
⚡ Velocidade média: ${currentSpeed.toFixed(1)} km/h

Parabéns pelo treino! 💪`);
    }

    setIsTracking(false);
    setCurrentDistance(0);
    setCurrentDuration(0);
    setCurrentSpeed(0);
    setLocations([]);
  };

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const caloriesRemaining = caloriesGoal - caloriesConsumed + caloriesBurned;
  const percentage = (caloriesConsumed / caloriesGoal) * 100;
  const waterPercentage = (waterConsumed / waterGoal) * 100;
  
  const getProgressColor = () => {
    if (percentage < 70) return 'from-green-400 to-green-600';
    if (percentage < 90) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  const getWaterProgressColor = () => {
    if (waterPercentage < 70) return 'from-blue-400 to-blue-600';
    if (waterPercentage < 90) return 'from-cyan-400 to-cyan-600';
    return 'from-green-400 to-green-600';
  };

  const handleAddWater = async (amount: number) => {
    const newTotal = Math.min(waterConsumed + amount, waterGoal);
    setWaterConsumed(newTotal);
    localStorage.setItem('waterConsumed', newTotal.toString());
  };

  const handleNavigate = (page: string) => {
    if (page === 'perfil') {
      router.push('/perfil');
    }
  };

  const handleOpenCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleOpenGallery = () => {
    fileInputRef.current?.click();
  };

  const analyzeImageWithAI = async (imageFile: File) => {
    setIsAnalyzing(true);
    setShowImageOptions(false);
    setAnalysisError(null);

    try {
      console.log('📸 Iniciando análise de imagem...');
      
      // Validar tamanho do arquivo (máx 5MB)
      if (imageFile.size > 5 * 1024 * 1024) {
        throw new Error('A imagem é muito grande. Por favor, escolha uma imagem menor que 5MB.');
      }

      console.log('✅ Tamanho da imagem validado:', (imageFile.size / 1024 / 1024).toFixed(2) + 'MB');

      // Converter imagem para base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      console.log('✅ Imagem convertida para base64');

      // Chamar API de análise de calorias
      console.log('🚀 Enviando para API de análise...');
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          mealType: 'Refeição',
        }),
      });

      console.log('📡 Resposta recebida:', response.status);

      const data = await response.json();
      console.log('📦 Dados recebidos:', data);

      if (!response.ok) {
        // Tratar erros específicos
        if (response.status === 401) {
          throw new Error('🔑 Chave da API OpenAI inválida ou expirada.\n\nVerifique se a chave está configurada corretamente nas variáveis de ambiente.');
        } else if (response.status === 429) {
          throw new Error('⏱️ Limite de requisições excedido.\n\nAguarde alguns minutos e tente novamente.');
        } else if (data.message) {
          throw new Error(data.message);
        } else {
          throw new Error(data.error || 'Erro ao analisar imagem');
        }
      }
      
      console.log('✅ Análise concluída com sucesso!');
      
      // Mostrar resultado da análise
      setAnalysisResult({
        calories: data.calories || 0,
        description: data.description || 'Refeição analisada',
        imageUrl: base64Image,
        foods: data.foods || [],
        portions: data.portions || '',
        confidence: data.confidence || 'média',
        sources: data.sources || '',
      });
      setShowAnalysisResult(true);
      
    } catch (error) {
      console.error('❌ Erro ao analisar imagem:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao analisar a imagem';
      setAnalysisError(errorMessage);
      
      // Mostrar erro em um alerta mais detalhado
      alert(`❌ Erro na Análise\n\n${errorMessage}\n\n💡 Dicas:\n• Certifique-se de que a imagem está clara e bem iluminada\n• Verifique se a API Key da OpenAI está configurada\n• Tente tirar outra foto da refeição\n• Verifique sua conexão com a internet`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAddMeal = async () => {
    if (!analysisResult) return;

    try {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const newMeal: Meal = {
        id: Date.now().toString(),
        name: analysisResult.description || 'Refeição',
        calories: analysisResult.calories,
        time: timeString,
        icon: '🍽️',
        meal_type: 'Refeição',
      };

      const updatedMeals = [...meals, newMeal];
      setMeals(updatedMeals);
      setCaloriesConsumed(prev => prev + newMeal.calories);

      // Salvar no localStorage
      localStorage.setItem('meals', JSON.stringify(updatedMeals));

      // Fechar diálogo e limpar estados
      setShowAnalysisResult(false);
      setAnalysisResult(null);

      alert(`✅ Refeição adicionada com sucesso!\n\n🔥 ${analysisResult.calories} kcal adicionadas à sua meta diária.`);
      
    } catch (error) {
      console.error('Erro ao salvar refeição:', error);
      alert('❌ Erro ao salvar refeição. Tente novamente.');
    }
  };

  const handleCancelAnalysis = () => {
    setShowAnalysisResult(false);
    setAnalysisResult(null);
  };

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      analyzeImageWithAI(file);
    }
    // Limpar input para permitir selecionar a mesma imagem novamente
    event.target.value = '';
  };

  const getConfidenceBadge = (confidence?: string) => {
    const colors = {
      'alta': 'bg-green-500',
      'média': 'bg-yellow-500',
      'baixa': 'bg-orange-500',
    };
    const color = colors[confidence as keyof typeof colors] || 'bg-gray-500';
    
    return (
      <span className={`${color} text-white text-xs px-3 py-1 rounded-full font-semibold`}>
        Confiança: {confidence || 'média'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-black" />
          <p className="text-gray-600">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelected}
        className="hidden"
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-black">BR CAL AI</h1>
              <p className="text-gray-500 text-sm">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <button 
            onClick={() => handleNavigate('perfil')}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors"
          >
            <User className="w-6 h-6 text-black" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 space-y-6 pb-32">
        {/* Scanner Card - Destaque Principal */}
        <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Análise com IA</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Escaneie sua Refeição</h2>
            <p className="text-gray-300 text-sm">Tire uma foto e descubra as calorias instantaneamente</p>
          </div>

          {/* Scanner Area */}
          <div className="bg-white/5 backdrop-blur-sm border-2 border-dashed border-white/20 rounded-2xl p-12 mb-6 flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-20 h-20 mx-auto mb-4 text-white/60" />
              <p className="text-white/60 text-sm">Aponte a câmera para sua comida</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleOpenCamera}
              className="bg-white text-black p-5 rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <Camera className="w-6 h-6" />
              Tirar Foto
            </button>
            <button
              onClick={handleOpenGallery}
              className="bg-white/10 backdrop-blur-sm text-white p-5 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-3 border border-white/20"
            >
              <ImageIcon className="w-6 h-6" />
              Galeria
            </button>
          </div>
        </div>

        {/* Activity Tracker Card */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-semibold">Rastreamento GPS</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Medir Distância</h2>
            <p className="text-green-100 text-sm">Rastreie sua atividade física com dados reais de GPS</p>
          </div>

          {/* Tracking Stats */}
          {isTracking ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <MapPin className="w-6 h-6 mx-auto mb-2 text-white/80" />
                  <p className="text-3xl font-bold">{currentDistance.toFixed(2)}</p>
                  <p className="text-xs text-white/70">km</p>
                </div>
                <div className="text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-white/80" />
                  <p className="text-3xl font-bold">{formatDuration(currentDuration)}</p>
                  <p className="text-xs text-white/70">tempo</p>
                </div>
                <div className="text-center">
                  <Navigation className="w-6 h-6 mx-auto mb-2 text-white/80" />
                  <p className="text-3xl font-bold">{currentSpeed.toFixed(1)}</p>
                  <p className="text-xs text-white/70">km/h</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 justify-center animate-pulse">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <p className="text-sm font-semibold">Rastreando sua localização...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-6 text-center">
              <Navigation className="w-16 h-16 mx-auto mb-4 text-white/60" />
              <p className="text-white/80 text-sm mb-2">Total percorrido hoje</p>
              <p className="text-5xl font-bold mb-1">{totalDistance.toFixed(2)}</p>
              <p className="text-white/70 text-sm">km</p>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={isTracking ? stopTracking : startTracking}
            className={`w-full p-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg ${
              isTracking 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-white text-green-600 hover:bg-gray-100'
            }`}
          >
            {isTracking ? (
              <>
                <Square className="w-6 h-6" />
                Parar Rastreamento
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Iniciar Rastreamento
              </>
            )}
          </button>

          {/* Activity Sessions Button */}
          {activitySessions.length > 0 && (
            <button
              onClick={() => setShowActivityDialog(true)}
              className="w-full mt-4 bg-white/10 backdrop-blur-sm text-white p-4 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2 border border-white/20"
            >
              <Activity className="w-5 h-5" />
              Ver Histórico ({activitySessions.length})
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-gray-500 text-xs mb-1">Meta</p>
            <p className="text-2xl font-bold text-black">{caloriesGoal}</p>
            <p className="text-gray-400 text-xs">kcal</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-gray-500 text-xs mb-1">Consumidas</p>
            <p className="text-2xl font-bold text-black">{caloriesConsumed}</p>
            <p className="text-gray-400 text-xs">kcal</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-gray-500 text-xs mb-1">Queimadas</p>
            <p className="text-2xl font-bold text-green-600">{caloriesBurned}</p>
            <p className="text-gray-400 text-xs">kcal</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-black">Progresso Diário</h3>
            <span className="text-sm text-gray-500">{percentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-500`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600">
              Restantes: <span className="font-bold text-green-600">{caloriesRemaining}</span> kcal
            </p>
          </div>
        </div>

        {/* Refeições do Dia */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-black">Refeições de Hoje</h2>
            <Utensils className="w-6 h-6 text-gray-400" />
          </div>

          <div className="space-y-3">
            {meals.length > 0 ? (
              meals.map((meal, index) => (
                <div key={meal.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{meal.icon}</span>
                    <div>
                      <p className="font-semibold text-black">{meal.name}</p>
                      <p className="text-sm text-gray-500">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-black">{meal.calories}</p>
                    <p className="text-xs text-gray-500">kcal</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma refeição registrada hoje</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Sessions Dialog */}
      {showActivityDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-black">Histórico de Atividades</h3>
              <button
                onClick={() => setShowActivityDialog(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {activitySessions.map((session) => (
                <div key={session.id} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-600" />
                      <p className="font-bold text-black">
                        {new Date(session.startTime).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      {session.caloriesBurned} kcal
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <MapPin className="w-5 h-5 mx-auto mb-1 text-green-600" />
                      <p className="text-2xl font-bold text-black">{session.distance.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">km</p>
                    </div>
                    <div className="text-center">
                      <Activity className="w-5 h-5 mx-auto mb-1 text-green-600" />
                      <p className="text-2xl font-bold text-black">{formatDuration(session.duration)}</p>
                      <p className="text-xs text-gray-600">tempo</p>
                    </div>
                    <div className="text-center">
                      <Navigation className="w-5 h-5 mx-auto mb-1 text-green-600" />
                      <p className="text-2xl font-bold text-black">{session.avgSpeed.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">km/h</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6">
              <button
                onClick={() => setShowActivityDialog(false)}
                className="w-full bg-black text-white p-5 rounded-2xl font-bold hover:bg-gray-800 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Result Dialog - Estilo Cal AI */}
      {showAnalysisResult && analysisResult && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-black">Resultado da Análise</h3>
              <button
                onClick={handleCancelAnalysis}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Imagem da Refeição */}
              <div className="rounded-2xl overflow-hidden">
                <img 
                  src={analysisResult.imageUrl} 
                  alt="Refeição analisada" 
                  className="w-full h-72 object-cover"
                />
              </div>

              {/* Calorias - Destaque */}
              <div className="bg-gradient-to-br from-black to-gray-800 text-white rounded-2xl p-8 text-center">
                <p className="text-sm opacity-80 mb-2">Calorias Totais</p>
                <p className="text-6xl font-bold mb-2">{analysisResult.calories}</p>
                <p className="text-sm opacity-80">kcal</p>
                <div className="mt-4">
                  {getConfidenceBadge(analysisResult.confidence)}
                </div>
              </div>

              {/* Alimentos Identificados */}
              {analysisResult.foods && analysisResult.foods.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <p className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                    <Utensils className="w-4 h-4" />
                    Alimentos Identificados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.foods.map((food, index) => (
                      <span key={index} className="bg-white text-black text-sm px-4 py-2 rounded-full font-medium border border-gray-200">
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Porções */}
              {analysisResult.portions && (
                <div className="bg-blue-50 rounded-2xl p-5">
                  <p className="text-sm font-bold text-blue-900 mb-2">Porções Estimadas</p>
                  <p className="text-blue-700 text-sm">{analysisResult.portions}</p>
                </div>
              )}

              {/* Descrição */}
              <div className="bg-gray-50 rounded-2xl p-5">
                <p className="text-sm font-bold text-black mb-2">Análise Detalhada</p>
                <p className="text-gray-700 text-sm leading-relaxed">{analysisResult.description}</p>
              </div>

              {/* Fontes */}
              {analysisResult.sources && (
                <div className="bg-purple-50 rounded-2xl p-4">
                  <p className="text-xs text-purple-700 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {analysisResult.sources}
                  </p>
                </div>
              )}
            </div>

            {/* Footer com Botões */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 space-y-3">
              <button
                onClick={handleConfirmAddMeal}
                className="w-full bg-black text-white p-5 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Check className="w-5 h-5" />
                Adicionar à Meta Diária
              </button>

              <button
                onClick={handleCancelAnalysis}
                className="w-full bg-gray-100 text-black p-5 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay - Estilo Cal AI */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="relative mb-6">
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-black" />
              <Sparkles className="w-6 h-6 absolute top-0 right-1/3 text-yellow-500 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-black">Analisando...</h3>
            <p className="text-gray-600 mb-4">
              Nossa IA está identificando os alimentos e calculando as calorias com precisão.
            </p>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-600 font-medium">
                📊 Fontes: Google Nutrition, Tabela TACO, USDA
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
