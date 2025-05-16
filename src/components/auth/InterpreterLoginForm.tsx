
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";
import { User, Lock, Globe2 } from "lucide-react";
import { ROLE_COLORS } from "@/lib/constants";

export const InterpreterLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulating login for demo
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };
  
  return (
    <Card className="w-full interpreter-glass rounded-3xl overflow-hidden">
      <motion.div
        className="p-8 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="p-3 bg-blue-500/10 rounded-full">
            <Globe2 className="h-10 w-10 text-blue-500" />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-center">
              <span className="text-gradient-interpreter">Espace interprète</span>
            </h2>
            <p className="text-sm text-muted-foreground text-center mt-1 max-w-xs">
              Connectez-vous pour accéder à votre espace personnel
            </p>
          </motion.div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Email
            </label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-blue-100 dark:border-blue-900/30 rounded-xl"
                placeholder="interpreter@example.com"
                disabled={isLoading}
              />
              <User className="h-5 w-5 text-blue-400/70 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              Mot de passe
            </label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-blue-100 dark:border-blue-900/30 rounded-xl"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <Lock className="h-5 w-5 text-blue-400/70 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Button 
              type="submit" 
              className="w-full py-6 font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span>Connexion en cours...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Globe2 className="mr-2 h-5 w-5" />
                  <span>Se connecter</span>
                </div>
              )}
            </Button>
          </motion.div>
          
          <div className="mt-4 text-center">
            <a 
              href="#" 
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Mot de passe oublié ?
            </a>
          </div>
        </form>
      </motion.div>
    </Card>
  );
};
