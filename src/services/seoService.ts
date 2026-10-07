import brandConfig from '../brand.config.json';
import { Product } from '../types';
import { Lang } from './i18n';

export interface SEOConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType?: 'website' | 'product';
  image?: string;
  keywords?: string[];
  product?: Product;
  categoryName?: string;
  categorySlug?: string;
  categoryProducts?: Product[];
  lang?: Lang;
  breadcrumbs?: { name: string; url: string }[];
}

const DOMAIN = brandConfig.domain || 'https://phlox-togo.com';
const DEFAULT_IMAGE = `${DOMAIN}/icon.svg`;

/**
 * Helper to update or create a meta tag by property or name
 */
function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Helper to remove a meta tag if it exists
 */
function removeMetaTag(attrName: 'name' | 'property', attrValue: string) {
  const element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (element) {
    element.remove();
  }
}

/**
 * Helper to update or create the canonical link tag
 */
function setCanonicalUrl(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * Helper to inject or update Schema.org JSON-LD script
 */
function setJsonLdSchema(schemaId: string, schemaData: object) {
  let script = document.getElementById(schemaId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = schemaId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaData, null, 2);
}

/**
 * Generate rich Schema.org structured data specifically tailored for Togo e-commerce & Google SEO
 */
export function generateSchemaOrg(config: SEOConfig): object {
  const { product, categoryName, categorySlug, categoryProducts = [], breadcrumbs = [] } = config;

  // 1. PRODUCT PAGE SCHEMA
  if (product) {
    const isAvailable = product.stock > 0;
    const productUrl = `${DOMAIN}/?product=${encodeURIComponent(product.id)}`;
    const imageUrl = product.image.startsWith('http') ? product.image : `${DOMAIN}${product.image}`;
    const cleanDescription = (config.lang === 'en' ? product.descriptionEn : product.descriptionFr)
      || product.descriptionFr
      || `${product.name} disponible chez Phlox Togo avec livraison rapide à Lomé et dans tout le Togo.`;

    const productSchema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${productUrl}#product`,
      name: product.name,
      image: [imageUrl, ...(product.gallery || []).map((img) => (img.startsWith('http') ? img : `${DOMAIN}${img}`))].filter(Boolean),
      description: cleanDescription,
      sku: product.id,
      mpn: `PHX-${product.id}`,
      brand: {
        '@type': 'Brand',
        name: product.name.split(' ')[0] || 'Phlox Togo'
      },
      category: product.category,
      itemCondition: 'https://schema.org/NewCondition',
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'XOF',
        price: product.price.toString(),
        priceValidUntil: '2027-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        availability: isAvailable
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'Phlox Togo',
          url: DOMAIN,
          telephone: brandConfig.whatsappNumber,
          areaServed: {
            '@type': 'Country',
            name: 'Togo'
          }
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'TG',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 7,
          returnMethod: 'https://schema.org/ReturnInStore',
          returnFees: 'https://schema.org/FreeReturn'
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: '1500',
            currency: 'XOF'
          },
          shippingDestination: [
            {
              '@type': 'DefinedRegion',
              addressCountry: 'TG',
              addressRegion: 'Maritime'
            },
            {
              '@type': 'DefinedRegion',
              addressCountry: 'TG',
              addressRegion: 'Plateaux'
            },
            {
              '@type': 'DefinedRegion',
              addressCountry: 'TG',
              addressRegion: 'Centrale'
            },
            {
              '@type': 'DefinedRegion',
              addressCountry: 'TG',
              addressRegion: 'Kara'
            },
            {
              '@type': 'DefinedRegion',
              addressCountry: 'TG',
              addressRegion: 'Savanes'
            }
          ],
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 1,
              unitCode: 'DAY'
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 3,
              unitCode: 'DAY'
            }
          }
        }
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '38',
        bestRating: '5',
        worstRating: '1'
      }
    };

    // Add Breadcrumbs schema
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: DOMAIN
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: product.category,
          item: `${DOMAIN}/?category=${encodeURIComponent(product.category)}`
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.name,
          item: productUrl
        }
      ]
    };

    return [productSchema, breadcrumbSchema];
  }

  // 2. CATEGORY / COLLECTION PAGE SCHEMA
  if (categoryName && categorySlug) {
    const categoryUrl = `${DOMAIN}/?category=${encodeURIComponent(categorySlug)}`;
    const collectionSchema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${categoryUrl}#collection`,
      url: categoryUrl,
      name: `${categoryName} au Togo | Phlox Togo`,
      description: `Découvrez notre collection de ${categoryName} au Togo. Meilleurs prix en FCFA, paiement Mobile Money (Mixx / Flooz) et livraison rapide à Lomé.`,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Phlox Togo',
        url: DOMAIN
      },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: categoryProducts.map((prod, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${DOMAIN}/?product=${encodeURIComponent(prod.id)}`,
          name: prod.name,
          image: prod.image.startsWith('http') ? prod.image : `${DOMAIN}${prod.image}`
        }))
      }
    };

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: DOMAIN
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: categoryName,
          item: categoryUrl
        }
      ]
    };

    return [collectionSchema, breadcrumbSchema];
  }

  // 3. HOME / GENERAL STORE SCHEMA
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore',
        '@id': `${DOMAIN}/#store`,
        name: 'Phlox Togo',
        alternateName: 'Phlox E-commerce Togo',
        description: 'Boutique e-commerce high-tech de référence au Togo : casques Beats, montres connectées, ordinateurs portables, consoles et accessoires avec livraison express à Lomé et paiement sécurisé Mixx / Flooz.',
        url: DOMAIN,
        logo: `${DOMAIN}/icon.svg`,
        image: `${DOMAIN}/icon.svg`,
        priceRange: '$$',
        currenciesAccepted: 'XOF',
        paymentAccepted: 'Cash, Mixx by Yas, Flooz Money',
        telephone: brandConfig.whatsappNumber,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Boulevard de la Kara',
          addressLocality: 'Lomé',
          addressRegion: 'Maritime',
          postalCode: '00228',
          addressCountry: 'TG'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 6.1375,
          longitude: 1.2125
        },
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '08:00',
          closes: '20:00'
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: brandConfig.whatsappNumber,
            contactType: 'customer support',
            contactOption: 'WhatsApp',
            areaServed: 'TG',
            availableLanguage: ['French', 'English']
          }
        ]
      },
      {
        '@type': 'WebSite',
        '@id': `${DOMAIN}/#website`,
        url: DOMAIN,
        name: 'Phlox Togo',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${DOMAIN}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };
}

/**
 * Main function to dynamically update all Document Head Meta Tags, OpenGraph, Twitter, and Schema.org
 */
export function updateDynamicSEO(config: SEOConfig) {
  if (typeof document === 'undefined') return;

  const {
    title,
    description,
    canonicalUrl,
    ogType = 'website',
    image = DEFAULT_IMAGE,
    product,
    lang = 'fr'
  } = config;

  // 1. Update Title & Meta Description
  document.title = title;
  setMetaTag('name', 'description', description);

  // 2. Local Togo & African SEO Keywords
  const defaultKeywords = [
    'boutique en ligne togo',
    'e-commerce lomé',
    'achat high-tech togo',
    'phlox togo',
    'mixx by yas paiement togo',
    'flooz money lomé',
    'livraison lomé togo',
    'casques beats togo',
    'montres connectées togo',
    'ordinateurs pc gaming lomé',
    'prix fcfa togo'
  ];
  const combinedKeywords = [...(config.keywords || []), ...defaultKeywords].join(', ');
  setMetaTag('name', 'keywords', combinedKeywords);

  // 3. Geographic / Local SEO Meta Tags for Togo
  setMetaTag('name', 'geo.region', 'TG-M');
  setMetaTag('name', 'geo.placename', 'Lomé, Togo');
  setMetaTag('name', 'geo.position', '6.1375;1.2125');
  setMetaTag('name', 'ICBM', '6.1375, 1.2125');

  // 4. Canonical URL
  setCanonicalUrl(canonicalUrl);

  // 5. OpenGraph Meta Tags
  setMetaTag('property', 'og:site_name', 'Phlox Togo');
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:type', ogType);
  setMetaTag('property', 'og:image', image.startsWith('http') ? image : `${DOMAIN}${image}`);
  setMetaTag('property', 'og:locale', lang === 'fr' ? 'fr_TG' : 'en_US');
  setMetaTag('property', 'og:locale:alternate', lang === 'fr' ? 'en_US' : 'fr_TG');

  // Product specific OpenGraph meta tags
  if (product) {
    setMetaTag('property', 'product:price:amount', product.price.toString());
    setMetaTag('property', 'product:price:currency', 'XOF');
    setMetaTag('property', 'product:availability', product.stock > 0 ? 'in stock' : 'out of stock');
    setMetaTag('property', 'product:retailer_item_id', product.id);
  } else {
    removeMetaTag('property', 'product:price:amount');
    removeMetaTag('property', 'product:price:currency');
    removeMetaTag('property', 'product:availability');
    removeMetaTag('property', 'product:retailer_item_id');
  }

  // 6. Twitter Card Meta Tags
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', image.startsWith('http') ? image : `${DOMAIN}${image}`);

  // 7. Schema.org JSON-LD Structured Data
  const structuredData = generateSchemaOrg(config);
  setJsonLdSchema('dynamic-seo-schema', structuredData);
}

/**
 * Format SEO title and description based on current app state
 */
export function buildSEOForContext({
  selectedProduct,
  selectedCategory,
  activeTab,
  allProducts,
  lang = 'fr'
}: {
  selectedProduct: Product | null;
  selectedCategory: string;
  activeTab: string;
  allProducts: Product[];
  lang: Lang;
}): SEOConfig {
  const isFrench = lang === 'fr';

  // 1. PRODUCT DETAIL MODAL / PAGE
  if (selectedProduct) {
    const formattedPrice = `${selectedProduct.price.toLocaleString('fr-FR')} FCFA`;
    const prodDesc = isFrench ? selectedProduct.descriptionFr : selectedProduct.descriptionEn;
    const catName = brandConfig.categories.find((c) => c.id === selectedProduct.category)?.frName || selectedProduct.category;

    const title = isFrench
      ? `${selectedProduct.name} - ${formattedPrice} | Phlox Togo (Livraison Lomé)`
      : `${selectedProduct.name} - ${formattedPrice} | Phlox Togo (Lomé Delivery)`;

    const description = isFrench
      ? `Achetez ${selectedProduct.name} à ${formattedPrice} au Togo. Stock vérifié, garantie, paiement Mobile Money (Mixx / Flooz) et livraison sécurisée à Lomé et dans toutes les régions.`
      : `Buy ${selectedProduct.name} for ${formattedPrice} in Togo. Verified stock, warranty, Mobile Money payment and safe delivery in Lomé and all regions.`;

    const productImg = selectedProduct.image.startsWith('http')
      ? selectedProduct.image
      : `${DOMAIN}${selectedProduct.image}`;

    return {
      title,
      description,
      canonicalUrl: `${DOMAIN}/?product=${encodeURIComponent(selectedProduct.id)}`,
      ogType: 'product',
      image: productImg,
      keywords: [
        selectedProduct.name.toLowerCase(),
        `prix ${selectedProduct.name.toLowerCase()} togo`,
        `acheter ${selectedProduct.name.toLowerCase()} lomé`,
        `${catName.toLowerCase()} togo`,
        'phlox togo high-tech'
      ],
      product: selectedProduct,
      lang
    };
  }

  // 2. CATEGORY FILTERED VIEW
  if (selectedCategory && selectedCategory !== 'all') {
    const catConfig = brandConfig.categories.find((c) => c.id === selectedCategory);
    const catName = isFrench ? (catConfig?.frName || selectedCategory) : (catConfig?.enName || selectedCategory);
    const categoryProducts = allProducts.filter((p) => p.category === selectedCategory);

    const title = isFrench
      ? `${catName} au Togo - Meilleurs Prix en FCFA & Livraison | Phlox Togo`
      : `${catName} in Togo - Best Prices in XOF & Delivery | Phlox Togo`;

    const description = isFrench
      ? `Découvrez notre sélection de ${catName.toLowerCase()} au Togo chez Phlox Togo. Casques, accessoires et appareils garantis. Livraison rapide à domicile à Lomé.`
      : `Explore our collection of ${catName.toLowerCase()} in Togo at Phlox Togo. Guaranteed devices and accessories with fast home delivery in Lomé.`;

    const catImage = catConfig?.image ? (catConfig.image.startsWith('http') ? catConfig.image : `${DOMAIN}${catConfig.image}`) : DEFAULT_IMAGE;

    return {
      title,
      description,
      canonicalUrl: `${DOMAIN}/?category=${encodeURIComponent(selectedCategory)}`,
      ogType: 'website',
      image: catImage,
      keywords: [
        `${catName.toLowerCase()} togo`,
        `${catName.toLowerCase()} lomé`,
        `meilleur prix ${catName.toLowerCase()} fcfa`,
        'vente matériel togo',
        'phlox togo'
      ],
      categoryName: catName,
      categorySlug: selectedCategory,
      categoryProducts,
      lang
    };
  }

  // 3. SPECIFIC TABS (Watchlist, Orders, Affiliation, Browse)
  if (activeTab === 'watchlist') {
    return {
      title: isFrench ? 'Mes Favoris & Liste d’Envies | Phlox Togo' : 'My Wishlist & Saved Products | Phlox Togo',
      description: isFrench
        ? 'Retrouvez vos articles high-tech sauvegardés chez Phlox Togo. Commandez facilement vos coups de cœur avec paiement Mixx / Flooz.'
        : 'View your saved high-tech products on Phlox Togo. Easily order your favorite items with Mobile Money.',
      canonicalUrl: `${DOMAIN}/?tab=watchlist`,
      ogType: 'website',
      lang
    };
  }

  if (activeTab === 'browse') {
    return {
      title: isFrench
        ? 'Catégories High-Tech au Togo - Écouteurs, PC, Montres, Consoles | Phlox Togo'
        : 'High-Tech Categories in Togo - Headphones, Laptops, Watches, Gaming | Phlox Togo',
      description: isFrench
        ? 'Parcourez toutes les catégories de produits tendance au Togo : écouteurs & casques, montres connectées, ordinateurs portables, consoles de jeux et VR.'
        : 'Browse all trending tech categories in Togo: headphones, smartwatches, laptops, gaming consoles, and VR headsets.',
      canonicalUrl: `${DOMAIN}/?tab=browse`,
      ogType: 'website',
      lang
    };
  }

  if (activeTab === 'projects') {
    return {
      title: isFrench
        ? 'Programme d’Affiliation Togo - Gagnez des Commissions | Phlox Togo'
        : 'Affiliate Program Togo - Earn Commissions | Phlox Togo',
      description: isFrench
        ? 'Devenez ambassadeur Phlox Togo : partagez vos liens d’affiliation et touchez 8% de commission sur chaque vente générée au Togo.'
        : 'Become a Phlox Togo ambassador: share your referral links and earn 8% commission on each sale in Togo.',
      canonicalUrl: `${DOMAIN}/?tab=affiliation`,
      ogType: 'website',
      lang
    };
  }

  if (activeTab === 'orders') {
    return {
      title: isFrench ? 'Suivi de Commande & Historique | Phlox Togo' : 'Track Orders & Purchase History | Phlox Togo',
      description: isFrench
        ? 'Suivez l’état de préparation et d’expédition de votre commande en direct au Togo. Téléchargez vos reçus et factures sécurisés.'
        : 'Track the live status of your order in Togo. Download receipts and access your purchase history.',
      canonicalUrl: `${DOMAIN}/?tab=orders`,
      ogType: 'website',
      lang
    };
  }

  // 4. DEFAULT HOME / SEARCH CATALOG
  return {
    title: isFrench
      ? 'Phlox Togo | Des produits tendance, simplement - Boutique E-Commerce Lomé'
      : 'Phlox Togo | Trending Tech Products - Lomé E-Commerce Store',
    description: isFrench
      ? 'Boutique en ligne de référence au Togo : casques audio, montres connectées, PC portables et consoles. Paiement sécurisé Mixx by Yas & Flooz, livraison express à Lomé.'
      : 'Premier online store in Togo: headphones, smartwatches, laptops, and gaming consoles. Secure Mobile Money payments and express delivery in Lomé.',
    canonicalUrl: DOMAIN,
    ogType: 'website',
    image: DEFAULT_IMAGE,
    lang
  };
}
