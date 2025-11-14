// bioapgreid/api/health-monitor.js
class HealthMonitor {
  constructor() {
    this.metrics = {
      apiHealth: {},
      parserPerformance: {},
      sitemapFreshness: null
    };
  }
  
  async checkSystemHealth() {
    const checks = [
      this.#checkAPIEndpoints(),
      this.#checkParserPerformance(),
      this.#checkSitemapFreshness(),
      this.#checkMemoryUsage()
    ];
    
    const results = await Promise.allSettled(checks);
    
    return {
      timestamp: new Date().toISOString(),
      overall: this.#calculateOverallHealth(results),
      details: results.map((r, i) => ({
        check: ['API', 'Parser', 'Sitemap', 'Memory'][i],
        status: r.status === 'fulfilled' ? 'healthy' : 'degraded',
        data: r.value || r.reason
      }))
    };
  }
  
  #calculateOverallHealth(results) {
    const healthyCount = results.filter(r => r.status === 'fulfilled').length;
    return healthyCount / results.length > 0.75 ? 'healthy' : 'degraded';
  }
}
