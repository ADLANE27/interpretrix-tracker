import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";
import { User, Lock, Sparkles, Headset } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z.string().min(1, "Veuillez saisir votre mot de passe"),
});

export const InterpreterLoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    console.log("Tentative de connexion interprète avec:", values.email);

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      });

      if (signInError) {
        throw signInError;
      }

      if (!signInData.user) {
        throw new Error("Aucun utilisateur trouvé");
      }

      console.log("Connexion réussie, vérification du rôle interprète...");

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', signInData.user.id)
        .eq('role', 'interpreter')
        .eq('active', true)
        .maybeSingle();

      console.log("Résultat vérification rôle:", { roleData, roleError });

      if (roleError) {
        throw new Error("Erreur lors de la vérification des droits d'accès.");
      }

      if (!roleData) {
        throw new Error("Cette interface est réservée aux interprètes.");
      }

      const { data: interpreterData, error: interpreterError } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .maybeSingle();

      console.log("Résultat vérification profil:", { interpreterData, interpreterError });

      if (interpreterError || !interpreterData) {
        throw new Error("Profil d'interprète introuvable.");
      }

      toast({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté en tant qu'interprète",
      });
      
      navigate("/interpreter");
    } catch (error: any) {
      console.error("Erreur complète:", error);
      await supabase.auth.signOut();
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const logoVariants = {
    initial: { scale: 0.8, opacity: 0, y: -10 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6, 
        delay: 0.1,
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <Card 
      asMotion
      motionProps={{
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.5 }
      }}
      className="overflow-hidden border-0 shadow-2xl bg-white/90 backdrop-blur-xl"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-palette-vivid-purple via-palette-magenta-pink to-palette-ocean-blue" />
      
      <CardHeader className="pb-0 space-y-2">
        <motion.div
          initial="initial"
          animate="animate"
          variants={logoVariants}
          className="flex justify-center mb-2"
        >
          <div className="relative">
            <motion.div
              animate={{
                rotate: [0, 5, 0, -5, 0],
                scale: [1, 1.05, 1, 1.05, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop"
              }}
              className="w-16 h-16 text-palette-vivid-purple"
            >
              <Headset size={64} className="text-palette-vivid-purple" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ 
                repeat: Infinity,
                repeatType: "reverse",
                duration: 2
              }}
              className="absolute -right-3 -top-2"
            >
              <Sparkles className="w-6 h-6 text-palette-bright-orange" />
            </motion.div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <CardTitle className="text-3xl font-bold tracking-tight text-gradient-primary text-center">
            Espace interprète
          </CardTitle>
          <CardDescription className="text-muted-foreground text-center pt-2">
            Connectez-vous pour accéder à votre espace personnel
          </CardDescription>
        </motion.div>
      </CardHeader>
      
      <CardContent className="pt-8">
        <Form {...form}>
          <motion.form 
            onSubmit={form.handleSubmit(handleSubmit)} 
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <User size={16} className="text-palette-vivid-purple" />
                      Email
                    </Label>
                    <FormControl>
                      <div className="relative overflow-hidden group">
                        <Input
                          {...field}
                          id="email"
                          type="email"
                          placeholder="interpreter@example.com"
                          disabled={isLoading}
                          className="w-full pl-4 pr-4 py-2 border border-gray-200 rounded-lg shadow-sm transition-all duration-300
                            focus:ring-2 focus:ring-palette-vivid-purple focus:border-palette-vivid-purple"
                        />
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-palette-vivid-purple to-palette-ocean-blue transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                      </div>
                    </FormControl>
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
                    )}
                  </FormItem>
                )}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Lock size={16} className="text-palette-vivid-purple" />
                      Mot de passe
                    </Label>
                    <FormControl>
                      <div className="relative overflow-hidden group">
                        <Input
                          {...field}
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="w-full pl-4 pr-4 py-2 border border-gray-200 rounded-lg shadow-sm transition-all duration-300
                            focus:ring-2 focus:ring-palette-vivid-purple focus:border-palette-vivid-purple"
                        />
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-palette-vivid-purple to-palette-ocean-blue transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                      </div>
                    </FormControl>
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.password.message}</p>
                    )}
                  </FormItem>
                )}
              />
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                type="submit" 
                className="w-full py-5 font-semibold text-white transition-all duration-300 bg-gradient-to-r from-palette-vivid-purple via-palette-magenta-pink to-palette-ocean-blue hover:opacity-90 rounded-lg shadow-md hover:shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" className="text-white" />
                    <span>Connexion en cours...</span>
                  </div>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </motion.div>
          </motion.form>
        </Form>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-4 pb-8 pt-2">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-center text-muted-foreground"
        >
          Si vous rencontrez des difficultés pour vous connecter, veuillez contacter 
          <a href="mailto:com@aftraduction.fr" className="text-palette-vivid-purple ml-1 hover:underline">
            notre support
          </a>
        </motion.p>
      </CardFooter>
    </Card>
  );
};
