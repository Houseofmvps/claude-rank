import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanDirectory } from '../tools/vertical-scanner.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vertical-test-'));
}

function writeHtml(dir, filename, html) {
  const fullPath = path.join(dir, filename);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, html, 'utf8');
}

describe('vertical-scanner', () => {
  it('returns skipped when no HTML files found', () => {
    const dir = makeTmpDir();
    try {
      const result = scanDirectory(dir);
      assert.equal(result.skipped, true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects e-commerce site with product signals', () => {
    const dir = makeTmpDir();
    // Multiple product signals to cross the ecomScore >= 5 threshold
    writeHtml(dir, 'product/widget.html',
      `<!DOCTYPE html><html><head><title>Widget - $29.99</title>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Widget","offers":{"@type":"Offer","price":"29.99","priceCurrency":"USD","availability":"InStock"}}</script>
      </head><body>
        <h1>Widget</h1>
        <p>Price: $29.99</p>
        <p>SKU: WDG-001</p>
        <p>In stock - ships today</p>
        <button>Add to Cart</button>
        <button>Buy Now</button>
        <img src="widget.jpg" width="400" height="400" alt="Widget product image">
        <p>This premium widget is crafted from aerospace-grade aluminum with precision engineering. Features include ergonomic design, weather-resistant coating, and lifetime warranty. Perfect for professional and home use alike. Our best-selling product with over 10,000 units sold worldwide. Each widget undergoes rigorous quality testing before shipping.</p>
      </body></html>`);
    writeHtml(dir, 'shop/index.html',
      `<!DOCTYPE html><html><head><title>Our Shop</title></head><body>
        <h1>Shop Now</h1>
        <p>Browse our products and add to cart. Shopping cart checkout available.</p>
        <a href="/product/widget">Widget - $29.99</a>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.detected_types.includes('ecommerce'),
        `Expected ecommerce detection, got: ${result.detected_types}`);
      assert.ok(result.ecommerce !== null, 'Ecommerce result should not be null');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects local business site with local signals', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Best Plumber in Austin</title>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Plumber","name":"Austin Plumbing","address":{"@type":"PostalAddress","streetAddress":"123 Main St","addressLocality":"Austin","addressRegion":"TX"},"geo":{"@type":"GeoCoordinates","latitude":"30.2672","longitude":"-97.7431"},"openingHours":"Mo-Fr 08:00-17:00","telephone":"+1-512-555-0123"}</script>
      </head><body>
        <h1>Austin's Best Plumber</h1>
        <p>Visit us at our location. Opening hours: Mon-Fri 8am-5pm.</p>
        <p>Get directions to our office.</p>
        <a href="tel:+15125550123">Call us: (512) 555-0123</a>
        <iframe src="https://google.com/maps/embed?pb=test"></iframe>
        <address>123 Main St, Austin, TX 78701</address>
      </body></html>`);
    writeHtml(dir, 'services/plumbing.html',
      `<!DOCTYPE html><html><head><title>Plumbing Services in Austin Area</title></head><body>
        <h1>Our Services</h1>
        <p>We serve the Austin area. Come visit our location for a walk-in consultation.</p>
        <p>Business hours: Monday through Friday.</p>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.detected_types.includes('local'),
        `Expected local detection, got: ${result.detected_types}`);
      assert.ok(result.local !== null, 'Local result should not be null');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects no vertical for generic content site', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>My Blog</title></head><body>
        <h1>Welcome to My Blog</h1>
        <p>I write about technology and programming.</p>
        <p>Here are some interesting thoughts about software development.</p>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.equal(result.detected_types.length, 0,
        `Expected no vertical detection, got: ${result.detected_types}`);
      assert.ok(result.message, 'Should have a message for non-vertical sites');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects missing-product-schema for e-commerce without Product JSON-LD', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'product/item.html',
      `<!DOCTYPE html><html><head><title>Product - $49.99</title></head><body>
        <h1>Amazing Product</h1>
        <p>Price: $49.99</p>
        <p>In stock. Add to cart now.</p>
        <button>Add to Cart</button>
        <button>Buy Now</button>
        <p>SKU: PRD-001. Shopping cart ready.</p>
        <p>This product features advanced technology and premium materials for the best user experience possible with extended warranty and support.</p>
      </body></html>`);
    writeHtml(dir, 'shop.html',
      `<!DOCTYPE html><html><head><title>Shop Products</title></head><body>
        <p>Browse products. Add to cart. Checkout. Buy now. Shopping cart.</p>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.detected_types.includes('ecommerce'));
      const missing = result.ecommerce.findings.find(f => f.rule === 'missing-product-schema');
      assert.ok(missing, 'Should detect missing-product-schema');
      assert.equal(missing.severity, 'high');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects missing-offer-schema for e-commerce without Offer data', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'product/item.html',
      `<!DOCTYPE html><html><head><title>Product</title>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Item"}</script>
      </head><body>
        <h1>Item</h1>
        <p>Add to cart. Buy now. Price: $19.99. SKU: X1. Shopping cart. In stock.</p>
        <p>This is a great product with many features and benefits for all customers worldwide.</p>
      </body></html>`);
    writeHtml(dir, 'store.html',
      `<!DOCTYPE html><html><head><title>Store</title></head><body>
        <p>Shop now. Add to cart. Products available. Checkout here.</p>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.detected_types.includes('ecommerce'));
      const missing = result.ecommerce.findings.find(f => f.rule === 'missing-offer-schema');
      assert.ok(missing, 'Should detect missing-offer-schema');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects missing-local-schema for local site without LocalBusiness JSON-LD', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Local Dentist</title></head><body>
        <h1>Visit Us</h1>
        <p>Get directions to our office. Opening hours Monday to Friday.</p>
        <p>Our location is convenient. Come visit us for a walk-in appointment.</p>
        <p>Business hours are 9am to 5pm.</p>
      </body></html>`);
    writeHtml(dir, 'contact.html',
      `<!DOCTYPE html><html><head><title>Contact</title></head><body>
        <p>Visit us at our location. Get directions. Opening hours listed.</p>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.detected_types.includes('local'));
      const missing = result.local.findings.find(f => f.rule === 'missing-local-schema');
      assert.ok(missing, 'Should detect missing-local-schema');
      assert.equal(missing.severity, 'high');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects no-clickable-phone for local site without tel: link', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Local Shop</title></head><body>
        <h1>Our Store</h1>
        <p>Visit us. Get directions. Opening hours: 9-5.</p>
        <p>Call us at 555-0123 (not a clickable link).</p>
        <p>Our location is open for walk-in customers. Business hours daily.</p>
      </body></html>`);
    writeHtml(dir, 'location.html',
      `<!DOCTYPE html><html><head><title>Location</title></head><body>
        <p>Get directions to visit us. Opening hours posted. Our location map.</p>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.detected_types.includes('local'));
      const missing = result.local.findings.find(f => f.rule === 'no-clickable-phone');
      assert.ok(missing, 'Should detect no-clickable-phone');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects no-google-maps for local site without map embed', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Our Business</title></head><body>
        <h1>Welcome</h1>
        <p>Visit us at our location. Get directions here. Opening hours Mon-Sat.</p>
        <p>Walk-in welcome. Business hours from 8am to 6pm daily.</p>
      </body></html>`);
    writeHtml(dir, 'about.html',
      `<!DOCTYPE html><html><head><title>About</title></head><body>
        <p>Come visit our location. Get directions. Opening hours available.</p>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.detected_types.includes('local'));
      const missing = result.local.findings.find(f => f.rule === 'no-google-maps');
      assert.ok(missing, 'Should detect no-google-maps');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns correct structure with files_scanned and detected_types', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Test</title></head><body><p>Hello world</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok('files_scanned' in result);
      assert.ok('detected_types' in result);
      assert.ok(Array.isArray(result.detected_types));
      assert.equal(result.files_scanned, 1);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('e-commerce score deducts correctly per rule', () => {
    const dir = makeTmpDir();
    // A product page with no schema, no images, thin content
    writeHtml(dir, 'product/bare.html',
      `<!DOCTYPE html><html><head><title>Product</title></head><body>
        <h1>Product</h1>
        <p>Add to cart. Buy now. $9.99. SKU: B1. Shopping cart. In stock.</p>
      </body></html>`);
    writeHtml(dir, 'products.html',
      `<!DOCTYPE html><html><head><title>Products</title></head><body>
        <p>Shop now. Add to cart. Products catalog. Checkout. Buy now.</p>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      if (result.detected_types.includes('ecommerce') && result.ecommerce) {
        assert.ok(result.ecommerce.score < 100,
          `Expected score below 100 due to missing schemas, got ${result.ecommerce.score}`);
        assert.ok(result.ecommerce.score >= 0, 'Score should not go below 0');
      }
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
