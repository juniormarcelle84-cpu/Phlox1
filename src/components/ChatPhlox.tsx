import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Truck,
  CreditCard,
  Package,
  Headphones,
  ShieldCheck,
  Tag,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bot
} from 'lucide-react';
import brandConfig from '../brand.config.json';
import { Product, Order } from '../types';
import { getProducts, getOrders, TOGO_CITIES } from '../services/storeService';
import { Lang, formatPrice } from '../services/i18n';

interface ChatPhloxProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProduct?: (product: Product) => void;
  onOpenTracking?: (orderId: string) => void;
  lang?: Lang;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestedTopics?: { label: string; actionKey: string }[];
  recommendedProducts?: Product[];
  orderInfo?: Order;
}

export const ChatPhlox: React.FC<ChatPhloxProps> = ({
  isOpen,
  onClose,
  onOpenProduct,
  onOpenTracking,
  lang = 'fr'
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProducts(getProducts());
    setOrders(getOrders());
  }, [isOpen]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'bot',
          text: `👋 Bonjour et bienvenue sur **ChatPhlox** ! Je suis votre conseiller virtuel PHLOX TOGO. Comment puis-je vous aider aujourd'hui ?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedTopics: [
            { label: '📦 Suivi de commande', actionKey: 'track_order' },
            { label: '🚚 Frais & Délais de livraison', actionKey: 'delivery_info' },
            { label: '💳 Payer par Mixx / Flooz', actionKey: 'payment_methods' },
            { label: '🎧 Conseils produits & Promos', actionKey: 'recommend_products' },
            { label: '🛡️ Garantie Satisfaction', actionKey: 'guarantee_info' },
            { label: '💬 Parler sur WhatsApp', actionKey: 'whatsapp_human' }
          ]
        }
      ]);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const addBotResponse = (
    text: string,
    options?: {
      suggestedTopics?: { label: string; actionKey: string }[];
      recommendedProducts?: Product[];
      orderInfo?: Order;
    }
  ) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ...options
        }
      ]);
    }, 450);
  };

  const handleTopicClick = (actionKey: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (actionKey === 'delivery_info') {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, sender: 'user', text: 'Quels sont les délais et frais de livraison au Togo ?', timestamp: time }
      ]);

      const citiesText = TOGO_CITIES.map(
        (c) => `• **${c.name}** : ${formatPrice(c.deliveryFee)} (${c.deliveryDelay.fr})`
      ).join('\n');

      addBotResponse(
        `🚚 **Nos tarifs et délais de livraison au Togo :**\n\n${citiesText}\n\n✨ *Livraison rapide avec remise en main propre et paiement à la livraison possible !*`,
        {
          suggestedTopics: [
            { label: '💳 Comment payer ?', actionKey: 'payment_methods' },
            { label: '🎧 Découvrir le catalogue', actionKey: 'recommend_products' },
            { label: '📦 Suivre une commande', actionKey: 'track_order' }
          ]
        }
      );
    } else if (actionKey === 'payment_methods') {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, sender: 'user', text: 'Comment régler mes achats (Mixx by Yas, Flooz) ?', timestamp: time }
      ]);

      addBotResponse(
        `💳 **Moyens de paiement acceptés sur PHLOX TOGO :**\n\n1. **Mixx by Yas (T-Money)** : Validation instantanée par push USSD (*145#) sur votre numéro.\n2. **Flooz Money (Moov)** : Débit sécurisé via le prompt USSD (*155#).\n3. **Espèces à la livraison** : Règlement en liquide directement au coursier après inspection.\n\n🔒 Toutes nos transactions PayGate sont 100% chiffrées et sécurisées.`,
        {
          suggestedTopics: [
            { label: '🎁 Codes promo disponibles', actionKey: 'promo_codes' },
            { label: '🚚 Délais de livraison', actionKey: 'delivery_info' },
            { label: '💬 Assistance WhatsApp', actionKey: 'whatsapp_human' }
          ]
        }
      );
    } else if (actionKey === 'track_order') {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, sender: 'user', text: 'Je souhaite suivre l’état de ma commande.', timestamp: time }
      ]);

      const latestOrders = getOrders();
      if (latestOrders.length > 0) {
        const lastOrder = latestOrders[0];
        const statusLabel =
          lastOrder.status === 'completed'
            ? '✅ Livrée & Terminée'
            : lastOrder.status === 'shipped'
            ? '🚚 Expédiée en cours'
            : lastOrder.status === 'paid'
            ? '💳 Payée (En préparation)'
            : lastOrder.status === 'cancelled'
            ? '❌ Annulée'
            : '⏳ En attente de règlement';

        addBotResponse(
          `📦 Nous avons retrouvé votre commande récente **${lastOrder.id}** (${lastOrder.customerCity}) statut : **${statusLabel}**.\n\nVous pouvez également saisir un autre identifiant de commande (ex: CMD-...) ci-dessous.`,
          {
            orderInfo: lastOrder,
            suggestedTopics: [
              { label: '💬 Contacter le support WhatsApp', actionKey: 'whatsapp_human' },
              { label: '🎧 Voir d’autres articles', actionKey: 'recommend_products' }
            ]
          }
        );
      } else {
        addBotResponse(
          `📦 Vous n'avez pas encore de commande enregistrée sur cet appareil. Pour suivre un colis, entrez simplement votre numéro de commande (ex: **CMD-12345**) dans ce chat !`,
          {
            suggestedTopics: [
              { label: '🎧 Voir les meilleures ventes', actionKey: 'recommend_products' },
              { label: '🚚 Tarifs livraison', actionKey: 'delivery_info' }
            ]
          }
        );
      }
    } else if (actionKey === 'recommend_products') {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, sender: 'user', text: 'Quels sont les produits populaires et promotions du moment ?', timestamp: time }
      ]);

      const all = getProducts();
      const topPicks = all.filter((p) => p.isPopular || p.isPromo).slice(0, 3);

      addBotResponse(
        `🎧 Voici notre sélection coup de cœur du moment ! Cliquez sur un article pour voir ses détails ou l'ajouter directement :`,
        {
          recommendedProducts: topPicks,
          suggestedTopics: [
            { label: '🚚 Frais de livraison', actionKey: 'delivery_info' },
            { label: '🎁 Codes promo', actionKey: 'promo_codes' },
            { label: '💬 Demander un conseil précis', actionKey: 'whatsapp_human' }
          ]
        }
      );
    } else if (actionKey === 'promo_codes') {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, sender: 'user', text: 'Quels sont les codes promo actifs ?', timestamp: time }
      ]);

      addBotResponse(
        `🎁 **Bons plans & Codes Réductions disponibles :**\n\n• **BIENVENUE10** : -10% sur votre première commande.\n• **PHLOX2026** : -15% de remise immédiate pour le lancement.\n\n💡 *Entrez simplement ces codes lors de la validation de votre panier dans l'étape Code Promo.*`,
        {
          suggestedTopics: [
            { label: '🎧 Choisir mes articles', actionKey: 'recommend_products' },
            { label: '💳 Comment payer ?', actionKey: 'payment_methods' }
          ]
        }
      );
    } else if (actionKey === 'guarantee_info') {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, sender: 'user', text: 'Comment fonctionne la Garantie Satisfaction ?', timestamp: time }
      ]);

      addBotResponse(
        `🛡️ **Garantie Satisfaction & Authenticité PHLOX :**\n\n1. **Contrôle à la réception** : Vous ouvrez et vérifiez le colis en présence du livreur avant de valider le règlement.\n2. **Garantie Constructeur** : Tous nos équipements électroniques bénéficient d'une garantie avec échange rapide en cas de défaut d'usine.\n3. **Support local** : Notre équipe à Lomé est disponible 7j/7 pour vous assister.`,
        {
          suggestedTopics: [
            { label: '🎧 Voir les produits', actionKey: 'recommend_products' },
            { label: '💬 Échanger sur WhatsApp', actionKey: 'whatsapp_human' }
          ]
        }
      );
    } else if (actionKey === 'whatsapp_human') {
      const whatsappUrl = `${brandConfig.whatsappUrlBase}?text=Bonjour Phlox Togo, je vous contacte depuis le ChatPhlox de la boutique en ligne pour des renseignements.`;
      window.open(whatsappUrl, '_blank');
      addBotResponse(
        `💬 Une fenêtre WhatsApp a été ouverte vers notre service client officiel (**${brandConfig.whatsappNumber}**). Notre équipe vous répond dans les plus brefs délais !`,
        {
          suggestedTopics: [
            { label: '📦 Suivre ma commande', actionKey: 'track_order' },
            { label: '🚚 Frais livraison', actionKey: 'delivery_info' }
          ]
        }
      );
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: query, timestamp: time }]);
    setInputText('');

    const lower = query.toLowerCase();

    // 1. Check if user typed an order ID
    if (lower.startsWith('cmd-') || lower.includes('cmd-')) {
      const match = lower.match(/cmd-[\w\d]+/i);
      const searchId = match ? match[0].toUpperCase() : lower.toUpperCase();
      const allOrders = getOrders();
      const found = allOrders.find((o) => o.id.toUpperCase() === searchId);

      if (found) {
        addBotResponse(
          `📦 Commande **${found.id}** trouvée !\n• Destinataire : ${found.customerName} (${found.customerPhone})\n• Ville : ${found.customerCity}\n• Montant total : ${formatPrice(found.totalAmount)}\n• Statut : **${found.status.toUpperCase()}**`,
          {
            orderInfo: found,
            suggestedTopics: [
              { label: '💬 Assistance WhatsApp', actionKey: 'whatsapp_human' },
              { label: '🚚 Délais de livraison', actionKey: 'delivery_info' }
            ]
          }
        );
        return;
      }
    }

    // 2. Intent matching: Delivery
    if (lower.includes('livraison') || lower.includes('délai') || lower.includes('frais') || lower.includes('lomé') || lower.includes('kara') || lower.includes('kpalimé')) {
      handleTopicClick('delivery_info');
      return;
    }

    // 3. Intent matching: Payment
    if (lower.includes('payer') || lower.includes('paiement') || lower.includes('mixx') || lower.includes('flooz') || lower.includes('tmoney') || lower.includes('moov')) {
      handleTopicClick('payment_methods');
      return;
    }

    // 4. Intent matching: Promo & Discount
    if (lower.includes('promo') || lower.includes('réduction') || lower.includes('rabais') || lower.includes('code') || lower.includes('coupon')) {
      handleTopicClick('promo_codes');
      return;
    }

    // 5. Intent matching: Catalog search & recommendations
    const allProducts = getProducts();
    const matchedProducts = allProducts.filter(
      (p) =>
        lower.includes(p.category.toLowerCase()) ||
        lower.includes(p.name.toLowerCase()) ||
        p.descriptionFr.toLowerCase().includes(lower)
    );

    if (matchedProducts.length > 0) {
      addBotResponse(
        `✨ J'ai trouvé **${matchedProducts.length} article(s)** correspondant à votre demande :`,
        {
          recommendedProducts: matchedProducts.slice(0, 3),
          suggestedTopics: [
            { label: '🚚 Frais de livraison', actionKey: 'delivery_info' },
            { label: '💳 Moyens de paiement', actionKey: 'payment_methods' },
            { label: '💬 Parler sur WhatsApp', actionKey: 'whatsapp_human' }
          ]
        }
      );
      return;
    }

    // Default intelligent fallback
    addBotResponse(
      `Merci pour votre message ! Pour vous apporter une réponse personnalisée, choisissez l'un des sujets ci-dessous ou échangez directement avec un conseiller humain sur WhatsApp :`,
      {
        suggestedTopics: [
          { label: '🎧 Voir nos produits tendance', actionKey: 'recommend_products' },
          { label: '🚚 Frais & Délais Togo', actionKey: 'delivery_info' },
          { label: '💳 Payer par Mixx / Flooz', actionKey: 'payment_methods' },
          { label: '💬 Ouvrir WhatsApp (+228 93 20 60 03)', actionKey: 'whatsapp_human' }
        ]
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-[#1B1A1B]/80 backdrop-blur-md animate-fadeIn">
      {/* Chat Container */}
      <div className="w-full sm:w-[440px] h-[90vh] sm:h-[640px] max-h-[720px] bg-[#312F30] rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-white/10 flex flex-col overflow-hidden text-[#FFFFFF] animate-slideUp">
        
        {/* Header */}
        <div className="bg-[#1B1A1B] text-white p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-[#7477FF] flex items-center justify-center text-white font-black shadow-md">
              <Bot size={22} />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#F9CD61] border-2 border-[#1B1A1B] rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm uppercase tracking-wider text-white">ChatPhlox Conseiller</h3>
                <span className="px-2 py-0.5 bg-[#7477FF] text-[#FFFFFF] text-[9px] font-black uppercase rounded-full">Togo</span>
              </div>
              <p className="text-[11px] text-[#C5D4CA] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F9CD61]" /> En ligne &bull; Réponses instantanées
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setMessages([]);
              }}
              title="Réinitialiser la conversation"
              className="p-2 text-[#C5D4CA] hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#C5D4CA] hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fermer ChatPhlox"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#1B1A1B]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-[#7477FF] text-white rounded-br-xs font-medium'
                    : 'bg-[#312F30] text-[#FFFFFF] border border-white/10 rounded-bl-xs'
                }`}
              >
                {m.text}
              </div>

              {/* Order Info Card if included */}
              {m.orderInfo && (
                <div className="w-full max-w-[85%] bg-[#312F30] border border-white/15 rounded-2xl p-3.5 space-y-2.5 mt-1 shadow-lg">
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="font-bold text-[#F9CD61]">{m.orderInfo.id}</span>
                    <span className="px-2 py-0.5 bg-[#7477FF]/20 text-[#7477FF] border border-[#7477FF]/30 rounded-full text-[10px] font-black uppercase">
                      {m.orderInfo.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#C5D4CA] space-y-1">
                    <p>Total : <strong className="text-white">{formatPrice(m.orderInfo.totalAmount)}</strong></p>
                    <p>Articles : <span className="text-white/90">{m.orderInfo.items.map((it) => it.productName).join(', ')}</span></p>
                    <p className="text-[11px] text-[#C5D4CA]/80">Ville : {m.orderInfo.customerCity}</p>
                  </div>
                  {onOpenTracking && (
                    <button
                      onClick={() => {
                        onOpenTracking(m.orderInfo!.id);
                        onClose();
                      }}
                      className="w-full py-2 bg-[#7477FF] hover:bg-[#5E62FF] text-white text-xs font-black uppercase tracking-wider rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Package size={14} />
                      <span>Suivre le colis en temps réel</span>
                    </button>
                  )}
                </div>
              )}

              {/* Recommended products carousel / cards */}
              {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                <div className="w-full space-y-2 mt-1">
                  {m.recommendedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-[#312F30] border border-white/10 p-2.5 rounded-2xl flex items-center gap-3 shadow-md hover:border-[#7477FF]/60 transition-colors"
                    >
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-12 h-12 object-cover rounded-xl bg-[#1B1A1B] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-white truncate">{p.name}</h4>
                        <span className="text-xs font-bold text-[#F9CD61]">{formatPrice(p.price)}</span>
                      </div>
                      {onOpenProduct && (
                        <button
                          onClick={() => {
                            onOpenProduct(p);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-[#7477FF] hover:bg-[#5E62FF] text-white text-[11px] font-black uppercase rounded-full cursor-pointer shrink-0 transition-colors"
                        >
                          Voir
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Topics / Action Chips */}
              {m.suggestedTopics && m.suggestedTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5 max-w-[95%]">
                  {m.suggestedTopics.map((topic, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTopicClick(topic.actionKey)}
                      className="text-[11px] font-bold px-3 py-1.5 bg-[#312F30] hover:bg-[#7477FF] text-[#FFFFFF] hover:text-white border border-white/15 rounded-full transition-all shadow-xs cursor-pointer text-left"
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-[#C5D4CA]/60 px-1 font-mono">{m.timestamp}</span>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-1.5 p-3 bg-[#312F30] border border-white/10 rounded-2xl w-fit shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#7477FF] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#7477FF] animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-[#7477FF] animate-bounce [animation-delay:0.4s]" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Bar & Input Form */}
        <div className="p-3 bg-[#312F30] border-t border-white/10 space-y-2">
          {/* Preset quick pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => handleTopicClick('delivery_info')}
              className="px-2.5 py-1 bg-[#1B1A1B] hover:bg-[#7477FF] text-[#FFFFFF] rounded-full text-[11px] font-bold shrink-0 transition-colors border border-white/10 cursor-pointer"
            >
              🚚 Livraison
            </button>
            <button
              onClick={() => handleTopicClick('payment_methods')}
              className="px-2.5 py-1 bg-[#1B1A1B] hover:bg-[#7477FF] text-[#FFFFFF] rounded-full text-[11px] font-bold shrink-0 transition-colors border border-white/10 cursor-pointer"
            >
              💳 Paiement Mixx / Flooz
            </button>
            <button
              onClick={() => handleTopicClick('promo_codes')}
              className="px-2.5 py-1 bg-[#1B1A1B] hover:bg-[#7477FF] text-[#FFFFFF] rounded-full text-[11px] font-bold shrink-0 transition-colors border border-white/10 cursor-pointer"
            >
              🎁 Codes Promo
            </button>
            <button
              onClick={() => handleTopicClick('whatsapp_human')}
              className="px-2.5 py-1 bg-[#1B1A1B] hover:bg-[#25D366] text-[#FFFFFF] rounded-full text-[11px] font-bold shrink-0 transition-colors border border-white/10 cursor-pointer"
            >
              💬 WhatsApp
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Posez votre question (ex: délai Kara, code promo...)"
              className="flex-1 bg-[#1B1A1B] text-white placeholder:text-[#C5D4CA]/50 text-xs sm:text-sm px-4 py-3 rounded-full border border-white/15 focus:border-[#7477FF] focus:outline-hidden min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-3 rounded-full transition-colors flex items-center justify-center cursor-pointer shrink-0 min-h-[44px] min-w-[44px] ${
                inputText.trim()
                  ? 'bg-[#7477FF] text-white hover:bg-[#5E62FF]'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
              aria-label="Envoyer le message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
