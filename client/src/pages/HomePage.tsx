/**
 * HomePage - 首页
 * 
 * 柔和赌场风格版本 + 服务器状态显示 + 流畅过渡动画
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { GAME_CONFIG } from '../config';
import { FallingItems } from '../components/FallingItems';

interface HomePageProps {
  nickname: string;
  setNickname: (name: string) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  error: string;
  clearError: () => void;
  onCreateRoom: (nickname: string) => void;
  onJoinRoom: (roomCode: string, nickname: string) => void;
  isConnecting: boolean;
}

export function HomePage({
  nickname,
  setNickname,
  roomCode,
  setRoomCode,
  serverUrl,
  setServerUrl,
  error,
  clearError,
  onCreateRoom,
  onJoinRoom,
}: HomePageProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [showSettings, setShowSettings] = useState(false);
  const [tempServerUrl, setTempServerUrl] = useState(serverUrl);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 可拖拽切换相关状态
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [dragProgress, setDragProgress] = useState(0); // 0 = create, 1 = join
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartProgress = useRef(0);

  // 检测服务器状态
  useEffect(() => {
    const checkServer = async () => {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${serverUrl}/socket.io/?EIO=4&transport=polling`, {
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        const isOk = response.ok || response.status === 400;
        setIsOnline(isOk);
        if (isOk) {
          setLatency(Date.now() - startTime);
        } else {
          setLatency(null);
        }
      } catch {
        setIsOnline(false);
        setLatency(null);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  // 点击切换标签
  const handleTabChange = (tab: 'create' | 'join') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setDragProgress(tab === 'create' ? 0 : 1);
  };

  // 拖拽开始
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    dragStartX.current = clientX;
    dragStartProgress.current = dragProgress;
  }, [dragProgress]);

  // 拖拽中
  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !tabContainerRef.current) return;
    
    const containerWidth = tabContainerRef.current.offsetWidth;
    const tabWidth = containerWidth / 2;
    const deltaX = clientX - dragStartX.current;
    const deltaProgress = deltaX / tabWidth;
    
    // 限制范围 0-1
    const newProgress = Math.max(0, Math.min(1, dragStartProgress.current + deltaProgress));
    setDragProgress(newProgress);
    
    // 实时更新激活的标签
    setActiveTab(newProgress > 0.5 ? 'join' : 'create');
  }, [isDragging]);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // 吸附到最近的一侧
    const targetTab = dragProgress > 0.5 ? 'join' : 'create';
    setActiveTab(targetTab);
    setDragProgress(targetTab === 'create' ? 0 : 1);
  }, [isDragging, dragProgress]);

  const handleCreateRoom = async () => {
    clearError();
    setIsLoading(true);
    await onCreateRoom(nickname);
  };

  const handleJoinRoom = async () => {
    clearError();
    setIsLoading(true);
    await onJoinRoom(roomCode, nickname);
  };

  const handleSaveServerUrl = () => {
    setServerUrl(tempServerUrl);
    localStorage.setItem('uno-server-url', tempServerUrl);
    setShowSettings(false);
  };

  const handleCancelServerUrl = () => {
    setTempServerUrl(serverUrl);
    setShowSettings(false);
  };

  const handleOpenSettings = () => {
    if (!showSettings) {
      setTempServerUrl(serverUrl);
    }
    setShowSettings(!showSettings);
  };

  // 状态显示配置
  const getStatusConfig = () => {
    if (isOnline) {
      return {
        icon: '●',
        text: latency ? `在线 (${latency}ms)` : '在线',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30'
      };
    }
    return {
      icon: '●',
      text: '离线',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30'
    };
  };

  const status = getStatusConfig();
  const canPlay = isOnline && !isLoading;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
      {/* 背景掉落动画 */}
      <FallingItems />
      
      {/* 加载遮罩 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="text-gold font-medium">连接中...</p>
          </div>
        </div>
      )}
      
      {/* 内容层 - 带入场动画 */}
      <div className="relative z-10 w-full flex flex-col items-center animate-fade-in-up">
        {/* 游戏标题 */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <h1 className="text-7xl font-black text-gold-light tracking-widest text-shadow-soft animate-title-glow">
              UNO
            </h1>
            <div className="absolute -inset-4 bg-gold/10 blur-3xl rounded-full -z-10 animate-pulse-slow" />
          </div>
          <p className="text-cream-muted text-lg mt-4 font-medium tracking-wide animate-fade-in-up-delay">
            多人在线纸牌游戏
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 px-6 py-3 bg-red-900/30 border border-red-500/30 text-red-200 rounded-xl text-sm animate-slide-in-right">
            {error}
          </div>
        )}

        {/* 主卡片 - 带浮动动画 */}
        <div className="w-full max-w-md casino-card p-8 animate-float-subtle">
          {/* 昵称输入 */}
          <div className="mb-6">
            <label className="block text-gold text-sm mb-2 font-medium tracking-wide">
              你的昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入昵称..."
              maxLength={GAME_CONFIG.maxNicknameLength}
              className="w-full px-4 py-3.5 bg-felt-dark/80 border border-gold/20 rounded-xl 
                text-cream placeholder-cream-muted/40 
                focus:outline-none focus:border-gold/50 focus:shadow-lg focus:scale-[1.02]
                transition-all duration-300 ease-out"
            />
          </div>

          {/* 标签页切换 - 可拖拽 */}
          <div 
            ref={tabContainerRef}
            className="flex mb-6 gap-2 p-1 bg-felt-dark/50 rounded-xl border border-gold/10 relative select-none"
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
            onTouchEnd={handleDragEnd}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {/* 滑动背景 - 跟随拖拽 */}
            <div 
              className="absolute top-1 bottom-1 bg-gold/20 rounded-lg border border-gold/30
                transition-transform duration-75 ease-out"
              style={{
                left: '4px',
                width: 'calc(50% - 4px)',
                transform: `translateX(${dragProgress * 100}%)`,
              }}
            />
            
            <button
              onClick={() => handleTabChange('create')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 relative z-10
                ${activeTab === 'create' ? 'text-gold-light' : 'text-cream-muted hover:text-cream'}`}
            >
              创建房间
            </button>
            <button
              onClick={() => handleTabChange('join')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 relative z-10
                ${activeTab === 'join' ? 'text-gold-light' : 'text-cream-muted hover:text-cream'}`}
            >
              加入房间
            </button>
          </div>

          {/* 内容区域 - 根据拖拽进度实时交叉淡入淡出 */}
          <div className="relative min-h-[120px]">
            {/* 创建房间 - 从右往左滑出 */}
            <div
              className="transition-all duration-75 ease-out absolute inset-x-0"
              style={{
                opacity: 1 - dragProgress,
                transform: `translateX(${dragProgress * -20}px)`,
                pointerEvents: dragProgress > 0.5 ? 'none' : 'auto',
                zIndex: dragProgress > 0.5 ? 0 : 1,
              }}
            >
              <button
                onClick={handleCreateRoom}
                disabled={!canPlay || dragProgress > 0.5}
                className="w-full py-4 btn-soft rounded-xl text-lg font-medium 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  active:scale-[0.98] transition-all duration-200"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    连接中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span className="transition-transform duration-200">+</span>
                    创建新房间
                  </span>
                )}
              </button>
            </div>

            {/* 加入房间 - 从左往右滑入 */}
            <div
              className="transition-all duration-75 ease-out absolute inset-x-0"
              style={{
                opacity: dragProgress,
                transform: `translateX(${(1 - dragProgress) * 20}px)`,
                pointerEvents: dragProgress < 0.5 ? 'none' : 'auto',
                zIndex: dragProgress < 0.5 ? 0 : 1,
              }}
            >
              <div className="space-y-4">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="输入房间码 (如: ABC123)"
                  maxLength={GAME_CONFIG.roomCodeLength}
                  className="w-full px-4 py-3.5 bg-felt-dark/80 border border-gold/20 rounded-xl 
                    text-cream placeholder-cream-muted/40 text-center font-mono tracking-widest
                    focus:outline-none focus:border-gold/50 focus:shadow-lg focus:scale-[1.02]
                    transition-all duration-300 ease-out"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!canPlay || dragProgress < 0.5}
                  className="w-full py-4 btn-soft rounded-xl text-lg font-medium 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    active:scale-[0.98] transition-all duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      连接中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span className="transition-transform duration-200">→</span>
                      加入房间
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 服务器设置 */}
          <div className="mt-6 pt-6 border-t border-gold/10">
            <button
              onClick={handleOpenSettings}
              className="flex items-center justify-center gap-2 w-full text-cream-muted/60 text-sm 
                hover:text-gold transition-all duration-300 group"
            >
              <span className="transition-transform duration-300 group-hover:rotate-90">⚙</span>
              <span>{showSettings ? '收起设置' : '服务器设置'}</span>
              <span className={`transition-transform duration-300 ${showSettings ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {/* 状态指示器 */}
            <div className="flex justify-center mt-3">
              <div 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border 
                  transition-all duration-500 ease-out
                  ${status.bgColor} ${status.borderColor} ${status.color}
                  hover:scale-105`}
              >
                <span className={`transition-all duration-500 ${isOnline ? 'animate-pulse' : ''}`}>
                  {status.icon}
                </span>
                <span className="font-medium transition-all duration-300">{status.text}</span>
                {isOnline && latency && (
                  <span className="text-[10px] opacity-60">
                    {latency < 50 ? '优秀' : latency < 100 ? '良好' : '一般'}
                  </span>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.reload();
                  }}
                  className="ml-1 opacity-50 hover:opacity-100 transition-all duration-200 hover:rotate-180"
                  title="刷新"
                >
                  ⟳
                </button>
              </div>
            </div>

            {/* 设置面板 - 带动画展开 */}
            <div 
              className={`grid transition-all duration-300 ease-out ${
                showSettings ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="space-y-4">
                  <div className="transform transition-all duration-300 delay-75">
                    <label className="block text-gold/70 text-xs mb-1.5">
                      服务器地址
                    </label>
                    <input
                      type="text"
                      value={tempServerUrl}
                      onChange={(e) => setTempServerUrl(e.target.value)}
                      placeholder="http://localhost:3001"
                      className="w-full px-3 py-2.5 bg-felt-dark/80 border border-gold/20 rounded-lg 
                        text-cream text-sm placeholder-cream-muted/30 font-mono
                        focus:outline-none focus:border-gold/40 focus:shadow-md
                        transition-all duration-200"
                    />
                  </div>
                  <div className="flex gap-3 transform transition-all duration-300 delay-100">
                    <button
                      onClick={handleCancelServerUrl}
                      className="flex-1 py-2 text-sm bg-felt-dark/60 border border-gold/20 
                        text-cream-muted rounded-lg hover:border-gold/40 hover:bg-felt-dark/80
                        transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveServerUrl}
                      className="flex-1 py-2 text-sm btn-soft rounded-lg
                        transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      保存
                    </button>
                  </div>
                  <p className="text-cream-muted/40 text-xs text-center transform transition-all duration-300 delay-150">
                    保存后刷新页面生效
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 游戏说明 */}
        <div className="mt-8 text-cream-muted/60 text-sm text-center space-y-1 animate-fade-in-up-delay-2">
          <p className="flex items-center justify-center gap-3">
            <span className="animate-pulse">◆</span>
            <span>支持 2-8 人同时游戏</span>
            <span className="animate-pulse">◆</span>
          </p>
          <p>包含 AI 玩家、联机对战等多种玩法</p>
        </div>
      </div>
    </div>
  );
}
