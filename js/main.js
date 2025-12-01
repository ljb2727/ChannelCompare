import { YouTubeAPI } from './api.js';
import { ChannelAnalyzer } from './analyzer.js';
import { ChartManager } from './chart.js';

class ChannelCompare {
    constructor() {
        this.api = new YouTubeAPI();
        this.analyzer = new ChannelAnalyzer();
        this.chartManager = new ChartManager();
        this.selectedChannels = [];
        this.maxChannels = 5;
        this.analyzedData = [];
        this.currentFilter = 'all'; // 필터 상태: 'all', 'short', 'long'

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadChannelsFromStorage();
        this.checkApiKey();
    }

    setupEventListeners() {
        // API Key Modal
        document.getElementById('apiKeyBtn').addEventListener('click', () => {
            document.getElementById('apiModal').classList.remove('hidden');
            document.getElementById('apiKeyInput').value = this.api.getApiKey();
        });

        document.getElementById('closeApiBtn').addEventListener('click', () => {
            document.getElementById('apiModal').classList.add('hidden');
        });

        document.getElementById('saveApiBtn').addEventListener('click', () => {
            const apiKey = document.getElementById('apiKeyInput').value.trim();
            if (apiKey) {
                this.api.setApiKey(apiKey);
                alert('API 키가 저장되었습니다!');
                document.getElementById('apiModal').classList.add('hidden');
            } else {
                alert('API 키를 입력해주세요.');
            }
        });

        // Engagement Info Modal
        document.getElementById('engagementInfo').addEventListener('click', () => {
            document.getElementById('engagementModal').classList.remove('hidden');
        });

        document.getElementById('closeEngagementBtn').addEventListener('click', () => {
            document.getElementById('engagementModal').classList.add('hidden');
        });

        // Close modals on background click
        document.getElementById('engagementModal').addEventListener('click', (e) => {
            if (e.target.id === 'engagementModal') {
                document.getElementById('engagementModal').classList.add('hidden');
            }
        });

        // Score Info Modal
        document.getElementById('scoreInfoBtn').addEventListener('click', () => {
            document.getElementById('scoreModal').classList.remove('hidden');
        });

        document.getElementById('closeScoreBtn').addEventListener('click', () => {
            document.getElementById('scoreModal').classList.add('hidden');
        });

        document.getElementById('scoreModal').addEventListener('click', (e) => {
            if (e.target.id === 'scoreModal') {
                document.getElementById('scoreModal').classList.add('hidden');
            }
        });

        // Search
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.searchChannel();
        });

        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchChannel();
            }
        });

        // Compare
        document.getElementById('compareBtn').addEventListener('click', () => {
            this.compareChannels();
        });

        // Filter buttons (delegated event)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                const filter = e.target.dataset.filter;
                this.applyFilter(filter);
                
                // Update active state
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    }

    checkApiKey() {
        if (!this.api.getApiKey()) {
            document.getElementById('apiModal').classList.remove('hidden');
        }
    }

    async searchChannel() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            alert('채널명을 입력해주세요.');
            return;
        }

        if (this.selectedChannels.length >= this.maxChannels) {
            alert(`최대 ${this.maxChannels}개 채널까지 추가할 수 있습니다.`);
            return;
        }

        try {
            const channelResult = await this.api.searchChannel(query);
            const channelId = channelResult.id.channelId;

            // 중복 체크
            if (this.selectedChannels.find(c => c.id === channelId)) {
                alert('이미 추가된 채널입니다.');
                return;
            }

            this.selectedChannels.push({
                id: channelId,
                title: channelResult.snippet.title,
                thumbnail: channelResult.snippet.thumbnails.default.url
            });

            this.updateSelectedChannelsUI();
            document.getElementById('searchInput').value = '';

        } catch (error) {
            console.error(error);
            alert('채널 검색에 실패했습니다: ' + error.message);
        }
    }

    updateSelectedChannelsUI() {
        const container = document.getElementById('selectedChannels');
        container.innerHTML = '';

        if (this.selectedChannels.length === 0) {
            container.innerHTML = '<div class="placeholder-chip">비교할 채널을 검색하여 추가하세요 (0/5)</div>';
            document.getElementById('compareBtn').disabled = true;
            return;
        }

        // Save to localStorage
        this.saveChannelsToStorage();

        this.selectedChannels.forEach((channel, index) => {
            const chip = document.createElement('div');
            chip.className = 'channel-chip';
            chip.innerHTML = `
                <img src="${channel.thumbnail}" alt="${channel.title}">
                <span>${channel.title}</span>
                <button class="remove-btn" data-index="${index}">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;

            chip.querySelector('.remove-btn').addEventListener('click', () => {
                this.removeChannel(index);
            });

            container.appendChild(chip);
        });

        // Update placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder-chip';
        placeholder.textContent = `${this.selectedChannels.length}/${this.maxChannels}`;
        container.appendChild(placeholder);

        // Enable compare button if at least 2 channels
        document.getElementById('compareBtn').disabled = this.selectedChannels.length < 2;
    }

    removeChannel(index) {
        this.selectedChannels.splice(index, 1);
        this.updateSelectedChannelsUI();
    }

    // LocalStorage 관리
    saveChannelsToStorage() {
        localStorage.setItem('selected_channels', JSON.stringify(this.selectedChannels));
    }

    loadChannelsFromStorage() {
        const stored = localStorage.getItem('selected_channels');
        if (stored) {
            try {
                this.selectedChannels = JSON.parse(stored);
                this.updateSelectedChannelsUI();
            } catch (e) {
                console.error('채널 데이터 로드 실패:', e);
                this.selectedChannels = [];
            }
        }
    }

    async compareChannels() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');

        try {
            this.analyzedData = [];

            // 각 채널의 상세 정보와 영상 목록 가져오기
            for (const channel of this.selectedChannels) {
                const channelDetails = await this.api.getChannelDetails(channel.id);
                const uploadsPlaylistId = channelDetails.contentDetails.relatedPlaylists.uploads;
                const videos = await this.api.getChannelVideos(uploadsPlaylistId, 50);

                const metrics = this.analyzer.analyzeMetrics(channelDetails, videos);
                const radarScores = this.analyzer.calculateRadarScores(metrics);
                const uploadPattern = this.analyzer.analyzeUploadPattern(videos);
                const bestVideo = this.analyzer.findBestVideo(videos);
                const keywords = this.analyzer.analyzeKeywords(videos);
                const score = this.analyzer.calculateChannelScore(metrics, videos);

                this.analyzedData.push({
                    metrics,
                    radarScores,
                    uploadPattern,
                    bestVideo,
                    keywords,
                    videos,
                    score // 점수 추가
                });
            }

            this.renderDashboard();

        } catch (error) {
            console.error(error);
            alert('분석 중 오류가 발생했습니다: ' + error.message);
        } finally {
            document.getElementById('loadingState').classList.add('hidden');
        }
    }

    renderDashboard() {
        document.getElementById('dashboard').classList.remove('hidden');

        // 필터링된 데이터 사용
        const displayData = this.getFilteredData();

        // 0. Overall Scores
        const scoreDataList = displayData.map(data => ({
            channelTitle: data.metrics.channelTitle,
            score: data.score
        }));
        this.chartManager.renderOverallScores(scoreDataList);

        // 1. Metrics Table
        const tableBody = document.querySelector('#metricsTable tbody');
        tableBody.innerHTML = displayData
            .map(data => this.analyzer.generateMetricsTableRow(data.metrics))
            .join('');

        // 2. Radar Chart
        const radarDataList = displayData.map(data => data.radarScores);
        this.chartManager.renderRadarChart(radarDataList);

        // 7. Length vs Views Chart
        this.chartManager.renderLengthVsViewsChart(displayData);

        // 8. Growth Trend Chart
        this.chartManager.renderGrowthTrendChart(displayData);

        // 4. Upload Pattern Heatmap
        const heatmapDataList = displayData.map(data => ({
            channelTitle: data.metrics.channelTitle,
            pattern: data.uploadPattern
        }));
        this.chartManager.renderHeatmaps(heatmapDataList);

        // 5. Best Videos
        const bestVideos = displayData.map(data => ({
            channelTitle: data.metrics.channelTitle,
            videoData: data.bestVideo
        }));
        this.chartManager.renderBestVideos(bestVideos);

        // 6. Keywords
        const keywordDataList = displayData.map(data => ({
            channelTitle: data.metrics.channelTitle,
            keywords: data.keywords
        }));
        this.chartManager.renderKeywords(keywordDataList);

        // 7. Recent Videos (최근 5개)
        const recentVideosData = displayData.map(data => ({
            channelTitle: data.metrics.channelTitle,
            videos: data.videos.slice(0, 5) // 최근 5개만
        }));
        this.chartManager.renderRecentVideos(recentVideosData);

        // 스크롤을 대시보드로 이동
        document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
    }

    // 필터 적용
    applyFilter(filter) {
        this.currentFilter = filter;
        if (this.analyzedData.length > 0) {
            this.renderDashboard();
        }
    }

    // 필터링된 데이터 생성
    getFilteredData() {
        return this.analyzedData.map(data => {
            let filteredVideos = data.videos;

            // 필터링 (3분 = 180초 기준)
            if (this.currentFilter === 'short') {
                filteredVideos = data.videos.filter(v => 
                    this.analyzer.parseDuration(v.contentDetails?.duration) <= 180
                );
            } else if (this.currentFilter === 'long') {
                filteredVideos = data.videos.filter(v => 
                    this.analyzer.parseDuration(v.contentDetails?.duration) > 180
                );
            }

            // 필터링된 영상으로 지표 재계산
            const filteredMetrics = this.analyzer.analyzeMetrics(data.metrics.channelData, filteredVideos);
            const filteredRadarScores = this.analyzer.calculateRadarScores(filteredMetrics);
            const filteredUploadPattern = this.analyzer.analyzeUploadPattern(filteredVideos);
            const filteredBestVideo = this.analyzer.findBestVideo(filteredVideos);
            const filteredKeywords = this.analyzer.analyzeKeywords(filteredVideos);
            const filteredScore = this.analyzer.calculateChannelScore(filteredMetrics, filteredVideos);

            return {
                metrics: filteredMetrics,
                radarScores: filteredRadarScores,
                uploadPattern: filteredUploadPattern,
                bestVideo: filteredBestVideo,
                keywords: filteredKeywords,
                videos: filteredVideos,
                score: filteredScore
            };
        });
    }
}

// Initialize App
new ChannelCompare();
