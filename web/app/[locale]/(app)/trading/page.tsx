"use client";

/**
 * Trading Page
 *
 * Simulated trading interface for OKX spot trading.
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRequireAuth } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/lib/routing";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import { CoffeeModal } from "@/components/layout/CoffeeModal";

// Types
interface Instrument {
  instId: string;
  baseCcy: string;
  quoteCcy: string;
  tickSz: string;
  lotSz: string;
  minSz: string;
  state: string;
}

interface Ticker {
  instId: string;
  last: string;
  bidPx: string;
  askPx: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
}

interface Balance {
  ccy: string;
  bal: string;
  availBal: string;
  frozenBal: string;
}

interface Order {
  instId: string;
  ordId: string;
  side: string;
  ordType: string;
  sz: string;
  px: string;
  state: string;
  fillSz: string;
  avgPx: string;
  cTime: string;
}

export default function TradingPage() {
  const t = useTranslations("trading");
  const { isAuthenticated, user, logout } = useRequireAuth();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedPair, setSelectedPair] = useState("BTC-USDT");
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Order form state
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("limit");
  const [orderSize, setOrderSize] = useState("");
  const [orderPrice, setOrderPrice] = useState("");

  // Fetch instruments on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchInstruments();
      fetchBalance();
    }
  }, [isAuthenticated]);

  // Fetch ticker when pair changes
  useEffect(() => {
    if (isAuthenticated && selectedPair) {
      fetchTicker();
      const interval = setInterval(fetchTicker, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, selectedPair]);

  const fetchInstruments = async () => {
    try {
      const response = await api.request<Instrument[]>("/api/trading/market/instruments");
      if (response.success && response.data) {
        setInstruments(response.data);
        if (response.data.length > 0 && !selectedPair) {
          setSelectedPair(response.data[0].instId);
        }
      }
    } catch (error) {
      console.error("Failed to fetch instruments:", error);
    }
  };

  const fetchTicker = async () => {
    try {
      const response = await api.request<Ticker>(`/api/trading/market/ticker/${selectedPair}`);
      if (response.success && response.data) {
        setTicker(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch ticker:", error);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await api.request<Balance[]>("/api/trading/account/balance");
      if (response.success && response.data) {
        setBalances(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await api.request<Order[]>("/api/trading/orders/pending");
      if (response.success && response.data) {
        setPendingOrders(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch pending orders:", error);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      const response = await api.request<Order[]>("/api/trading/orders/history");
      if (response.success && response.data) {
        setOrderHistory(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch order history:", error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!orderSize || (orderType === "limit" && !orderPrice)) {
      alert("请填写完整订单信息");
      return;
    }

    setLoading(true);
    try {
      const response = await api.request<{ ordId: string }>("/api/trading/orders/order", {
        method: "POST",
        body: JSON.stringify({
          instId: selectedPair,
          side: orderSide,
          ordType: orderType,
          sz: orderSize,
          px: orderType === "limit" ? orderPrice : undefined,
        }),
      });

      if (response.success) {
        alert(`下单成功！订单ID: ${response.data?.ordId}`);
        setOrderSize("");
        setOrderPrice("");
        fetchPendingOrders();
        fetchBalance();
      }
    } catch (error) {
      alert(`下单失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (instId: string, ordId: string) => {
    try {
      const response = await api.request("/api/trading/orders/order/cancel", {
        method: "POST",
        body: JSON.stringify({ instId, ordId }),
      });

      if (response.success) {
        alert("撤单成功");
        fetchPendingOrders();
        fetchBalance();
      }
    } catch (error) {
      alert(`撤单失败: ${error}`);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // Get USDT balance
  const usdtBalance = balances.find((b) => b.ccy === "USDT");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-2xl font-bold text-sky-500">
              QuantOL
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-sky-400 transition-colors"
              >
                {t("dashboard")}
              </Link>
              <Link
                href="/backtest"
                className="text-muted-foreground hover:text-sky-400 transition-colors"
              >
                {t("backtesting")}
              </Link>
              <Link
                href="/trading"
                className="text-foreground hover:text-sky-400 transition-colors"
              >
                {t("trading")}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <CoffeeModal />
            <UserAccountMenu username={user?.username || ""} onLogout={logout} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 space-y-4">
        {/* Account Balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("accountBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {usdtBalance && (
                <div>
                  <span className="text-muted-foreground">USDT: </span>
                  <span className="font-mono">{parseFloat(usdtBalance.availBal).toFixed(2)}</span>
                </div>
              )}
              {balances
                .filter((b) => b.ccy !== "USDT" && parseFloat(b.bal) > 0)
                .slice(0, 5)
                .map((b) => (
                  <div key={b.ccy}>
                    <span className="text-muted-foreground">{b.ccy}: </span>
                    <span className="font-mono">{parseFloat(b.bal).toFixed(8)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Market Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Pair Selector */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("selectPair")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {instruments
                      .filter((i) => i.state === "live")
                      .slice(0, 50)
                      .map((i) => (
                        <SelectItem key={i.instId} value={i.instId}>
                          {i.instId}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Ticker */}
            {ticker && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{ticker.instId}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">{t("lastPrice")}</div>
                      <div className="text-lg font-mono">{ticker.last}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{t("24hHigh")}</div>
                      <div className="font-mono text-green-500">{ticker.high24h}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{t("24hLow")}</div>
                      <div className="font-mono text-red-500">{ticker.low24h}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{t("24hVol")}</div>
                      <div className="font-mono">{parseFloat(ticker.vol24h).toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Orders Tabs */}
            <Card>
              <CardContent className="pt-4">
                <Tabs defaultValue="pending" onValueChange={(v) => {
                  if (v === "pending") fetchPendingOrders();
                  if (v === "history") fetchOrderHistory();
                }}>
                  <TabsList>
                    <TabsTrigger value="pending">{t("pendingOrders")}</TabsTrigger>
                    <TabsTrigger value="history">{t("orderHistory")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending" className="mt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">{t("pair")}</th>
                            <th className="text-left p-2">{t("side")}</th>
                            <th className="text-left p-2">{t("type")}</th>
                            <th className="text-left p-2">{t("price")}</th>
                            <th className="text-left p-2">{t("size")}</th>
                            <th className="text-left p-2">{t("filled")}</th>
                            <th className="text-left p-2">{t("action")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingOrders.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center p-4 text-muted-foreground">
                                {t("noOrders")}
                              </td>
                            </tr>
                          ) : (
                            pendingOrders.map((order) => (
                              <tr key={order.ordId} className="border-b">
                                <td className="p-2">{order.instId}</td>
                                <td className={`p-2 ${order.side === "buy" ? "text-green-500" : "text-red-500"}`}>
                                  {order.side === "buy" ? t("buy") : t("sell")}
                                </td>
                                <td className="p-2">{order.ordType}</td>
                                <td className="p-2 font-mono">{order.px}</td>
                                <td className="p-2 font-mono">{order.sz}</td>
                                <td className="p-2 font-mono">{order.fillSz || "-"}</td>
                                <td className="p-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleCancelOrder(order.instId, order.ordId)}
                                  >
                                    {t("cancel")}
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                  <TabsContent value="history" className="mt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">{t("pair")}</th>
                            <th className="text-left p-2">{t("side")}</th>
                            <th className="text-left p-2">{t("type")}</th>
                            <th className="text-left p-2">{t("price")}</th>
                            <th className="text-left p-2">{t("size")}</th>
                            <th className="text-left p-2">{t("avgPrice")}</th>
                            <th className="text-left p-2">{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderHistory.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center p-4 text-muted-foreground">
                                {t("noHistory")}
                              </td>
                            </tr>
                          ) : (
                            orderHistory.slice(0, 20).map((order) => (
                              <tr key={order.ordId} className="border-b">
                                <td className="p-2">{order.instId}</td>
                                <td className={`p-2 ${order.side === "buy" ? "text-green-500" : "text-red-500"}`}>
                                  {order.side === "buy" ? t("buy") : t("sell")}
                                </td>
                                <td className="p-2">{order.ordType}</td>
                                <td className="p-2 font-mono">{order.px}</td>
                                <td className="p-2 font-mono">{order.sz}</td>
                                <td className="p-2 font-mono">{order.avgPx || "-"}</td>
                                <td className="p-2">{order.state}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right: Order Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{t("placeOrder")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buy/Sell Toggle */}
                <Tabs value={orderSide} onValueChange={(v) => setOrderSide(v as "buy" | "sell")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                      {t("buy")}
                    </TabsTrigger>
                    <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                      {t("sell")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Order Type */}
                <div className="space-y-2">
                  <Label>{t("orderType")}</Label>
                  <Select value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="limit">{t("limit")}</SelectItem>
                      <SelectItem value="market">{t("market")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price (for limit orders) */}
                {orderType === "limit" && (
                  <div className="space-y-2">
                    <Label>{t("price")}</Label>
                    <Input
                      type="number"
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(e.target.value)}
                      placeholder={ticker?.last || "0.00"}
                      step="any"
                    />
                  </div>
                )}

                {/* Size */}
                <div className="space-y-2">
                  <Label>{t("size")}</Label>
                  <Input
                    type="number"
                    value={orderSize}
                    onChange={(e) => setOrderSize(e.target.value)}
                    placeholder="0.00"
                    step="any"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  className={`w-full ${orderSide === "buy" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}
                  onClick={handlePlaceOrder}
                  disabled={loading}
                >
                  {loading ? t("processing") : orderSide === "buy" ? t("buy") : t("sell")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
