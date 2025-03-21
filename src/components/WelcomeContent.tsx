
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset, ChevronRight, CheckCircle, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const WelcomeContent = () => {
  const features = [
    { icon: <CheckCircle className="h-5 w-5 text-palette-vivid-purple" />, text: "Messagerie en temps réel" },
    { icon: <CheckCircle className="h-5 w-5 text-palette-vivid-purple" />, text: "Gestion des missions" },
    { icon: <CheckCircle className="h-5 w-5 text-palette-vivid-purple" />, text: "Suivi de statut" },
    { icon: <CheckCircle className="h-5 w-5 text-palette-vivid-purple" />, text: "Terminologie spécialisée" },
  ];

  const testimonials = [
    { name: "Marie L.", role: "Interprète", text: "Une plateforme qui a révolutionné mon travail quotidien.", rating: 5 },
    { name: "Thomas R.", role: "Administrateur", text: "Interface intuitive et fonctionnalités puissantes.", rating: 5 },
  ];

  return (
    <div className="relative z-10 px-4 py-8 w-full max-w-6xl mx-auto">
      {/* Hero Section */}
      <motion.div 
        className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-16"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <motion.div 
          className="flex-1 text-left"
          variants={fadeIn}
          transition={{ delay: 0.2 }}
        >
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            variants={fadeIn}
          >
            <span className="text-gradient-primary">Plateforme d'interprétation</span>
            <br />professionnelle
          </motion.h1>
          
          <motion.p 
            className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-xl"
            variants={fadeIn}
          >
            Connectez-vous à votre espace de travail pour accéder à vos missions, communiquer en temps réel et gérer vos ressources d'interprétation.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4"
            variants={fadeIn}
          >
            <Button asChild size="lg" className="text-base">
              <Link to="/admin/login" className="flex items-center justify-center gap-2">
                <Building className="w-5 h-5" />
                <span>Espace Administrateur</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            
            <Button asChild variant="secondary" size="lg" className="text-base">
              <Link to="/interpreter/login" className="flex items-center justify-center gap-2">
                <Headset className="w-5 h-5" />
                <span>Espace Interprète</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="flex-1 flex justify-center"
          variants={fadeIn}
          transition={{ delay: 0.4 }}
        >
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
              transition: { duration: 0.3 }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-palette-soft-purple to-palette-soft-blue rounded-xl -m-2 blur-sm opacity-70"></div>
            <motion.img 
              src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
              alt="Interpretix Logo" 
              className="h-64 sm:h-80 w-auto relative z-10"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 10,
                delay: 0.3
              }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* Features Section */}
      <motion.div 
        className="mb-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.h2 
          className="text-2xl md:text-3xl font-bold text-center mb-10"
          variants={fadeIn}
        >
          <span className="text-gradient-secondary">Fonctionnalités clés</span>
        </motion.h2>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeIn}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="hover-elevate"
            >
              <Card asMotion 
                motionProps={{
                  whileHover: { y: -5 }
                }}
                className="h-full"
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-palette-soft-purple w-12 h-12 rounded-full flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-medium mb-2">{feature.text}</h3>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      
      {/* Testimonials */}
      <motion.div 
        className="mb-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.h2 
          className="text-2xl md:text-3xl font-bold text-center mb-10"
          variants={fadeIn}
        >
          <span className="text-gradient-primary">Témoignages</span>
        </motion.h2>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={fadeIn}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="hover-elevate"
            >
              <Card asMotion
                motionProps={{
                  whileHover: { y: -5 }
                }}
                className="h-full"
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <div className="flex mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-4 italic">"{testimonial.text}"</p>
                    <div className="mt-auto">
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-sm text-slate-500">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      
      {/* Call to Action */}
      <motion.div 
        className="text-center py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <div className="glass-card p-8 rounded-xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Prêt à commencer?</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-xl mx-auto">
            Connectez-vous à votre espace pour accéder à toutes les fonctionnalités de la plateforme.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/admin/login">Accès Administrateur</Link>
            </Button>
            
            <Button asChild variant="secondary" size="lg">
              <Link to="/interpreter/login">Accès Interprète</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
