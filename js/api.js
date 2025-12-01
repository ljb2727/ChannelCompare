export class YouTubeAPI {
    constructor() {
        this.apiKey = localStorage.getItem('youtube_api_key') || '';
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('youtube_api_key', key);
    }

    getApiKey() {
        return this.apiKey;
    }

    async searchChannel(query) {
        if (!this.apiKey) throw new Error('API 키가 없습니다.');

        // First, try to find by channel ID or handle if it looks like one
        // But standard search is usually enough for names
        const url = `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${this.apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || '채널 검색에 실패했습니다.');
        }

        const data = await response.json();
        if (!data.items || data.items.length === 0) {
            throw new Error('채널을 찾을 수 없습니다.');
        }

        return data.items[0];
    }

    async getChannelDetails(channelId) {
        if (!this.apiKey) throw new Error('API 키가 없습니다.');

        const url = `${this.baseUrl}/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${channelId}&key=${this.apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('채널 정보를 가져오는데 실패했습니다.');

        const data = await response.json();
        return data.items[0];
    }

    async getChannelVideos(uploadsPlaylistId, maxResults = 50) {
        if (!this.apiKey) throw new Error('API 키가 없습니다.');

        // 1. Get Playlist Items (Video IDs)
        const playlistUrl = `${this.baseUrl}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${this.apiKey}`;
        const playlistResponse = await fetch(playlistUrl);
        
        if (!playlistResponse.ok) throw new Error('영상 목록을 가져오는데 실패했습니다.');
        
        const playlistData = await playlistResponse.json();
        if (!playlistData.items || playlistData.items.length === 0) return [];

        const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');

        // 2. Get Video Statistics
        const videosUrl = `${this.baseUrl}/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${this.apiKey}`;
        const videosResponse = await fetch(videosUrl);

        if (!videosResponse.ok) throw new Error('영상 통계를 가져오는데 실패했습니다.');

        const videosData = await videosResponse.json();
        return videosData.items;
    }
}
