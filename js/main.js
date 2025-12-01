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

                this.analyzedData.push({
                    metrics,
                    radarScores,
                    uploadPattern,
                    bestVideo,
                    keywords
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

        // 1. Metrics Table
        const tableBody = document.querySelector('#metricsTable tbody');
        tableBody.innerHTML = this.analyzedData
            .map(data => this.analyzer.generateMetricsTableRow(data.metrics))
            .join('');

        // 2. Radar Chart
        const radarDataList = this.analyzedData.map(data => data.radarScores);
        this.chartManager.renderRadarChart(radarDataList);

        // 3. Content Type Chart
        const contentTypeDataList = this.analyzedData.map(data => data.metrics);
        this.chartManager.renderContentTypeChart(contentTypeDataList);

        // 7. Length vs Views Chart
        this.chartManager.renderLengthVsViewsChart(this.analyzedData);

        // 4. Upload Pattern Heatmap
        const heatmapDataList = this.analyzedData.map(data => ({
            channelTitle: data.metrics.channelTitle,
            pattern: data.uploadPattern
        }));
        this.chartManager.renderHeatmaps(heatmapDataList);

        // 5. Best Videos
        const bestVideos = this.analyzedData.map(data => ({
            channelTitle: data.metrics.channelTitle,
            videoData: data.bestVideo
        }));
        this.chartManager.renderBestVideos(bestVideos);

        // 6. Keywords
        const keywordDataList = this.analyzedData.map(data => ({
            channelTitle: data.metrics.channelTitle,
            keywords: data.keywords
        }));
        this.chartManager.renderKeywords(keywordDataList);

        // 스크롤을 대시보드로 이동
        document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize App
new ChannelCompare();
