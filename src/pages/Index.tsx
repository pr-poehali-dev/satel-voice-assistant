import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

type CommandType = {
  id: string;
  text: string;
  timestamp: Date;
  response: string;
  category: 'app' | 'search' | 'media' | 'info' | 'system' | 'note';
};

type SatelaState = 'idle' | 'listening' | 'thinking' | 'speaking';

const Index = () => {
  const [isActive, setIsActive] = useState(false);
  const [satelaState, setSatelaState] = useState<SatelaState>('idle');
  const [commands, setCommands] = useState<CommandType[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');

        setCurrentText(transcript);

        if (event.results[event.results.length - 1].isFinal) {
          if (!isActive && transcript.toLowerCase().includes('сатела')) {
            setIsActive(true);
            setSatelaState('listening');
            toast.success('Сатела активирована');
            speak('Слушаю вас');
          } else if (isActive) {
            processCommand(transcript);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'no-speech') {
          setSatelaState('idle');
        }
      };

      recognitionRef.current.onend = () => {
        if (isListeningForWakeWord) {
          recognitionRef.current.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isActive, isListeningForWakeWord]);

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListeningForWakeWord(true);
      recognitionRef.current.start();
      toast.info('Микрофон включен. Скажите "Сатела" для активации');
    } else {
      toast.error('Голосовое управление не поддерживается в этом браузере');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      setIsListeningForWakeWord(false);
      recognitionRef.current.stop();
      setIsActive(false);
      setSatelaState('idle');
      setCurrentText('');
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.0;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  const processCommand = (command: string) => {
    setSatelaState('thinking');
    const lowerCommand = command.toLowerCase();
    
    let response = '';
    let category: CommandType['category'] = 'system';

    if (lowerCommand.includes('открой') || lowerCommand.includes('запусти')) {
      if (lowerCommand.includes('браузер') || lowerCommand.includes('chrome') || lowerCommand.includes('firefox')) {
        response = 'Открываю браузер';
        category = 'app';
      } else if (lowerCommand.includes('калькулятор')) {
        response = 'Открываю калькулятор';
        category = 'app';
      } else if (lowerCommand.includes('блокнот') || lowerCommand.includes('notepad')) {
        response = 'Открываю блокнот';
        category = 'app';
      } else {
        response = 'Команда распознана, но приложение не найдено';
        category = 'app';
      }
    } else if (lowerCommand.includes('найди') || lowerCommand.includes('поищи') || lowerCommand.includes('найти')) {
      const searchQuery = lowerCommand.replace(/найди|поищи|найти|в интернете/g, '').trim();
      response = `Ищу информацию: ${searchQuery}`;
      category = 'search';
    } else if (lowerCommand.includes('музык') || lowerCommand.includes('песн') || lowerCommand.includes('включи')) {
      response = 'Включаю музыку';
      category = 'media';
    } else if (lowerCommand.includes('пауза') || lowerCommand.includes('стоп')) {
      response = 'Ставлю на паузу';
      category = 'media';
    } else if (lowerCommand.includes('погода')) {
      response = 'Сегодня +5°C, облачно с прояснениями';
      category = 'info';
    } else if (lowerCommand.includes('время') || lowerCommand.includes('который час')) {
      const now = new Date();
      response = `Сейчас ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      category = 'info';
    } else if (lowerCommand.includes('дата')) {
      const now = new Date();
      response = `Сегодня ${now.toLocaleDateString('ru-RU')}`;
      category = 'info';
    } else if (lowerCommand.includes('напомни') || lowerCommand.includes('заметка')) {
      response = 'Напоминание создано';
      category = 'note';
    } else if (lowerCommand.includes('спасибо')) {
      response = 'Всегда пожалуйста!';
      category = 'system';
    } else if (lowerCommand.includes('выключись') || lowerCommand.includes('отключись')) {
      response = 'До встречи!';
      category = 'system';
      setTimeout(() => {
        setIsActive(false);
        stopListening();
      }, 2000);
    } else {
      response = 'Команда не распознана. Попробуйте сформулировать иначе';
      category = 'system';
    }

    setTimeout(() => {
      setSatelaState('speaking');
      speak(response);
      
      const newCommand: CommandType = {
        id: Date.now().toString(),
        text: command,
        timestamp: new Date(),
        response,
        category
      };
      
      setCommands(prev => [newCommand, ...prev]);
      setCurrentText('');
      
      setTimeout(() => {
        setSatelaState('listening');
      }, 2000);
    }, 1000);
  };

  const getCategoryIcon = (category: CommandType['category']) => {
    switch (category) {
      case 'app': return 'AppWindow';
      case 'search': return 'Search';
      case 'media': return 'Music';
      case 'info': return 'Info';
      case 'note': return 'StickyNote';
      default: return 'Terminal';
    }
  };

  const getCategoryColor = (category: CommandType['category']) => {
    switch (category) {
      case 'app': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'search': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'media': return 'bg-pink-500/20 text-pink-400 border-pink-500/50';
      case 'info': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
      case 'note': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getSatelaStateText = () => {
    switch (satelaState) {
      case 'idle': return 'В ожидании';
      case 'listening': return 'Слушаю...';
      case 'thinking': return 'Думаю...';
      case 'speaking': return 'Отвечаю...';
    }
  };

  const getSatelaPose = () => {
    switch (satelaState) {
      case 'idle': return 'translate-y-0';
      case 'listening': return 'translate-y-0';
      case 'thinking': return '-translate-y-2';
      case 'speaking': return 'translate-y-1';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#221F3A] to-[#1A1F2C] flex">
      <div className="w-1/2 flex flex-col items-center justify-center p-8 border-r border-primary/20">
        <div className="relative">
          <div 
            className={`w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/40 flex items-center justify-center transition-all duration-500 ${
              isActive ? 'animate-pulse-glow' : ''
            } ${getSatelaPose()}`}
          >
            <div className="w-56 h-56 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
              <div className="text-center">
                <div className="mb-4 animate-float">
                  <Icon name="Sparkles" size={80} className="text-primary mx-auto" />
                </div>
                <h2 className="text-2xl font-bold text-primary mb-2">Сатела</h2>
                <p className="text-sm text-muted-foreground">{getSatelaStateText()}</p>
              </div>
            </div>
          </div>
          
          {isActive && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
              <Badge variant="outline" className="bg-primary/20 border-primary text-primary animate-scale-in">
                Активна
              </Badge>
            </div>
          )}
        </div>

        <div className="mt-12 flex gap-4">
          {!isListeningForWakeWord ? (
            <Button 
              onClick={startListening} 
              size="lg"
              className="bg-primary hover:bg-primary/80 text-primary-foreground gap-2"
            >
              <Icon name="Mic" size={20} />
              Включить микрофон
            </Button>
          ) : (
            <Button 
              onClick={stopListening} 
              size="lg"
              variant="destructive"
              className="gap-2"
            >
              <Icon name="MicOff" size={20} />
              Выключить
            </Button>
          )}
        </div>

        {currentText && (
          <Card className="mt-8 p-4 w-full max-w-md bg-card/50 backdrop-blur-sm border-primary/30 animate-fade-in">
            <p className="text-sm text-muted-foreground mb-1">Распознано:</p>
            <p className="text-foreground">{currentText}</p>
          </Card>
        )}
      </div>

      <div className="w-1/2 flex flex-col p-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-primary mb-2">Голосовой помощник Сатела</h1>
          <p className="text-muted-foreground">
            Скажите "Сатела" для активации, затем произнесите команду
          </p>
        </div>

        <Card className="flex-1 bg-card/30 backdrop-blur-sm border-primary/30">
          <div className="p-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Icon name="History" size={20} className="text-primary" />
              История команд
            </h3>
          </div>
          
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-4 space-y-4">
              {commands.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="MessageSquare" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Команды появятся здесь</p>
                </div>
              ) : (
                commands.map((cmd) => (
                  <Card key={cmd.id} className="p-4 bg-muted/30 border-primary/20 animate-fade-in hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Badge className={`mt-1 ${getCategoryColor(cmd.category)}`}>
                        <Icon name={getCategoryIcon(cmd.category)} size={14} className="mr-1" />
                        {cmd.category}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-1">{cmd.text}</p>
                        <p className="text-sm text-muted-foreground mb-2">{cmd.response}</p>
                        <p className="text-xs text-muted-foreground">
                          {cmd.timestamp.toLocaleTimeString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Card className="p-3 bg-muted/30 border-primary/20 text-center">
            <Icon name="AppWindow" size={20} className="mx-auto mb-1 text-blue-400" />
            <p className="text-xs text-muted-foreground">Приложения</p>
          </Card>
          <Card className="p-3 bg-muted/30 border-primary/20 text-center">
            <Icon name="Search" size={20} className="mx-auto mb-1 text-purple-400" />
            <p className="text-xs text-muted-foreground">Поиск</p>
          </Card>
          <Card className="p-3 bg-muted/30 border-primary/20 text-center">
            <Icon name="Music" size={20} className="mx-auto mb-1 text-pink-400" />
            <p className="text-xs text-muted-foreground">Медиа</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
