import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Scale, Lock, Mail, ArrowRight } from "lucide-react";

export default function Login() {
    const [, setLocation] = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            // Store session token
            localStorage.setItem("session_token", data.sessionToken);
            localStorage.setItem("user", JSON.stringify(data.user));

            console.log("[LOGIN] Success:", data.user.email);

            // Redirect to dashboard
            setLocation("/dashboard");
        } catch (err: any) {
            setError(err.message || "A apărut o eroare la autentificare");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-700 bg-slate-800/90 backdrop-blur">
                <CardHeader className="text-center space-y-4">
                    {/* Logo */}
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Scale className="w-8 h-8 text-white" />
                    </div>

                    <div>
                        <CardTitle className="text-2xl font-bold text-white">
                            INM Mentor
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Platformă de pregătire pentru admiterea la INM
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Demo credentials hint */}
                        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-sm">
                            <p className="text-blue-300 font-medium mb-1">🔑 Credențiale Demo:</p>
                            <p className="text-blue-200 font-mono text-xs">
                                Email: demo@inm.ro<br />
                                Parolă: demo123
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="demo@inm.ro"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">
                                Parolă
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Se autentifică...
                                </>
                            ) : (
                                <>
                                    Autentificare
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        <p>© 2025 INM Mentor. Toate drepturile rezervate.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
