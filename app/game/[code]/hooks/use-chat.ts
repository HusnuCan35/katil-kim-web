import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Message, Room } from '@/types';
import { useSound } from '@/hooks/use-sound';
import { validateMessage } from '@/lib/chat-filter';

export function useChat(room: Room | null, playerId: string | null, playerName: string, showChatModal: boolean) {
    const { playSound } = useSound();
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [unreadMessages, setUnreadMessages] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<{ content: string; timestamp: number } | undefined>(undefined);
    const [chatTimeout, setChatTimeout] = useState<number | null>(null);
    const messageHistoryRef = useRef<number[]>([]);

    // Load existing messages
    useEffect(() => {
        if (!room?.id) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', room.id)
                .order('created_at', { ascending: true });

            if (data) {
                const validMessages = data.filter((msg: Message) => validateMessage(msg.content).isValid);
                setMessages(validMessages);
            }
        };
        fetchMessages();

        const channel = supabase
            .channel('chat_room_' + room.id)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `room_id=eq.${room.id}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;

                    // Receive-Side Filter
                    if (!newMsg.is_system) {
                        const validation = validateMessage(newMsg.content);
                        if (!validation.isValid) return;
                    }

                    setMessages((prev) => [...prev, newMsg]);
                    if (!showChatModal) {
                        setUnreadMessages((prev) => prev + 1);
                        playSound('success');
                    }
                    if (messagesEndRef.current) {
                        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [room?.id, showChatModal, playSound]);

    // Auto-scroll on modal open
    useEffect(() => {
        if (showChatModal && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, showChatModal]);

    const handleSendMessage = async () => {
        // 1. Check Timeout
        if (chatTimeout && Date.now() < chatTimeout) {
            const remaining = Math.ceil((chatTimeout - Date.now()) / 1000);
            alert(`Çok hızlı mesaj gönderdiğiniz için ${remaining} saniye susturuldunuz.`);
            return;
        } else if (chatTimeout && Date.now() >= chatTimeout) {
            setChatTimeout(null);
        }

        if (!messageInput.trim() || !playerId || !room) {
            return;
        }

        const content = messageInput.trim();

        // 2. Chat Content Filter
        const validation = validateMessage(content, lastMessageRef.current);
        if (!validation.isValid) {
            alert(validation.error);
            playSound('error');
            return;
        }

        // 3. Spam Rate Limit Check
        const now = Date.now();
        const recentMessages = messageHistoryRef.current.filter(t => now - t < 5000);
        if (recentMessages.length >= 5) {
            const timeoutDuration = 30000;
            setChatTimeout(now + timeoutDuration);
            alert("Çok hızlı mesaj gönderiyorsunuz! 30 saniye boyunca mesaj gönderemezsiniz.");
            messageHistoryRef.current = [];
            return;
        }
        messageHistoryRef.current = [...recentMessages, now];

        setMessageInput('');

        try {
            const { error } = await supabase.from('messages').insert({
                room_id: room.id,
                player_id: playerId,
                player_name: playerName,
                content: content
            });

            if (error) {
                console.error("Supabase Error sending message:", error);
                alert("Mesaj gönderilemedi: " + error.message);
                setMessageInput(content);
            } else {
                lastMessageRef.current = { content, timestamp: Date.now() };
            }
        } catch (err) {
            console.error('Unexpected error sending message:', err);
            setMessageInput(content);
        }
    };

    return {
        messages,
        messageInput,
        setMessageInput,
        unreadMessages,
        setUnreadMessages,
        handleSendMessage,
        messagesEndRef
    };
}
