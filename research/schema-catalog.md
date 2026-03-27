# Schema Catalog — 25 Critical Schema Types (2026)

*All schemas use JSON-LD format. Fields marked REQUIRED are critical for validation; RECOMMENDED for AI visibility.*

## Content & Publishing

### 1. Article / BlogPosting / NewsArticle
**Use**: Blog posts, news, long-form content
- REQUIRED: headline, image, datePublished, author
- RECOMMENDED: dateModified, articleBody, wordCount, articleSection

### 2. NewsArticle
**Use**: Breaking news, journalism
- REQUIRED: headline, datePublished, author, body
- RECOMMENDED: dateline, printSection, printEdition

### 3. ScholarlyArticle
**Use**: Research papers, academic content
- REQUIRED: headline, author, datePublished
- RECOMMENDED: abstract, author.affiliation, citation

### 4. BreadcrumbList
**Use**: Navigation hierarchy on all pages
- REQUIRED: itemListElement[].name, itemListElement[].item
- RECOMMENDED: position

### 5. FAQPage
**Use**: FAQ sections, Q&A content
- REQUIRED: mainEntity[].question, mainEntity[].acceptedAnswer.text
- RECOMMENDED: acceptedAnswer.url

## E-Commerce & Products

### 6. Product
**Use**: Product pages, catalog listings
- REQUIRED: name, image, description
- RECOMMENDED: offers, aggregateRating, brand

### 7. Offer / AggregateOffer
**Use**: Pricing, availability, deals
- REQUIRED: price, priceCurrency, availability
- RECOMMENDED: url, priceValidUntil, seller

### 8. AggregateRating
**Use**: User reviews, ratings
- REQUIRED: ratingValue, ratingCount
- RECOMMENDED: bestRating, worstRating, reviewCount

### 9. Review / AggregateRating
**Use**: Customer reviews, testimonials
- REQUIRED: reviewRating.ratingValue, author, reviewBody
- RECOMMENDED: datePublished, reviewRating.ratingCount

## Local & Events

### 10. LocalBusiness
**Use**: Service businesses, locations
- REQUIRED: name, address, telephone
- RECOMMENDED: openingHours, geo, areaServed

### 11. Organization
**Use**: Company info, brand identity
- REQUIRED: name, url, logo
- RECOMMENDED: sameAs (social links), contact, description

### 12. Person
**Use**: Author bios, employee directories
- REQUIRED: name, image, url
- RECOMMENDED: jobTitle, affiliation, sameAs

### 13. Event
**Use**: Webinars, conferences, workshops
- REQUIRED: name, startDate, location
- RECOMMENDED: description, offers, performer, endDate

## Services & Expertise

### 14. Service
**Use**: Service pages, skill listings
- REQUIRED: name, description, areaServed
- RECOMMENDED: provider, offers, serviceType

### 15. ProfessionalService
**Use**: Consulting, legal, medical services
- REQUIRED: name, image, areaServed
- RECOMMENDED: hasCredential, makesOffer, serviceArea

### 16. MedicalBusiness
**Use**: Health, fitness, wellness
- REQUIRED: name, address, medicalSpecialty
- RECOMMENDED: hasCredential, knowsLanguage

## Knowledge & How-To

### 17. HowTo
**Use**: Step-by-step guides, tutorials, recipes
- REQUIRED: name, step[].name, step[].text
- RECOMMENDED: image, estimatedCost, totalTime

### 18. HowToStep
**Use**: Individual steps in guides
- REQUIRED: name, text
- RECOMMENDED: image, url

### 19. WebContent
**Use**: Generic web pages, landing pages
- REQUIRED: name, headline
- RECOMMENDED: datePublished, author, image

## Media & Creative

### 20. ImageObject
**Use**: Standalone images, galleries
- REQUIRED: url, name
- RECOMMENDED: caption, creditText, contentLocation

### 21. VideoObject
**Use**: Embedded videos, tutorials
- REQUIRED: name, description, thumbnailUrl, uploadDate
- RECOMMENDED: contentUrl, duration, transcript

### 22. Podcast / PodcastEpisode
**Use**: Audio content, podcasts
- REQUIRED: name, description, url
- RECOMMENDED: author, datePublished, audio

## Navigation & Lists

### 23. ItemList / CollectionPage
**Use**: Category pages, archives, collections
- REQUIRED: itemListElement[].name
- RECOMMENDED: itemListElement[].position, itemListElement[].url

### 24. SearchAction
**Use**: Site search integration
- REQUIRED: target (with {search_term_string})
- RECOMMENDED: query-input

## Q&A & Community

### 25. Question / Answer
**Use**: Q&A sites, forums, knowledge bases
- REQUIRED: name (question text), acceptedAnswer
- RECOMMENDED: author, dateCreated, upvoteCount

---

## Quick Implementation Priority

**High Impact** (do first):
- Article / BlogPosting
- Product
- Organization
- LocalBusiness
- BreadcrumbList

**Medium Impact** (recommended):
- AggregateRating / Review
- HowTo
- Event
- FAQPage

**Niche/Conditional**:
- NewsArticle, ScholarlyArticle
- MedicalBusiness, ProfessionalService
- Podcast, VideoObject

---

*Reference: schema.org, Google Search Central, Search Engine Journal*
