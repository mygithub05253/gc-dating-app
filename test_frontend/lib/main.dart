import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:kakao_flutter_sdk_user/kakao_flutter_sdk_user.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import 'dart:convert';

void main() {
  KakaoSdk.init(nativeAppKey: '033bc5c71a42c748495bf1ec7b0ef77e');
  runApp(const EmberTestApp());
}

class EmberTestApp extends StatelessWidget {
  const EmberTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ember Test',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6B35),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

// ── 공통 상태 관리 ──
class AppState {
  static final AppState _instance = AppState._();
  factory AppState() => _instance;
  AppState._();

  // 배포 서버: https://ember-app.duckdns.org
  // 에뮬레이터 로컬: http://10.0.2.2:8080
  // 폰+에뮬 동시: PC 로컬 IP (http://192.168.35.32:8080)
  final String baseUrl = 'https://ember-app.duckdns.org';
  final Dio dio = Dio();

  String? accessToken;
  String? refreshToken;
  String? kakaoAccessToken;
  int? userId;
  int onboardingStep = 0;
  bool onboardingCompleted = false;
  String? accountStatus;
  String? restoreToken;

  Options get authHeaders => Options(
    headers: {'Authorization': 'Bearer $accessToken'},
  );

  String errMsg(dynamic e) {
    if (e is DioException && e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map) return '[${data['code']}] ${data['message']}';
    }
    return '$e';
  }
}

// ══════════════════════════════════════
// 1.1 스플래시 및 자동 로그인
// ══════════════════════════════════════
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  String status = '로딩 중...';

  @override
  void initState() {
    super.initState();
    _checkAutoLogin();
  }

  Future<void> _checkAutoLogin() async {
    await Future.delayed(const Duration(seconds: 2));
    final app = AppState();

    // 저장된 RT 없으면 로그인 화면으로
    if (app.refreshToken == null) {
      setState(() => status = '로그인이 필요합니다');
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) _goToLogin();
      return;
    }

    // 자동 로그인 시도
    try {
      final res = await app.dio.post('${app.baseUrl}/api/auth/refresh',
        data: {'refreshToken': app.refreshToken});
      app.accessToken = res.data['data']['accessToken'];
      app.refreshToken = res.data['data']['refreshToken'];
      if (mounted) _goToHome();
    } catch (e) {
      setState(() => status = '세션 만료');
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) _goToLogin();
    }
  }

  void _goToLogin() => Navigator.pushReplacement(
    context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  void _goToHome() => Navigator.pushReplacement(
    context, MaterialPageRoute(builder: (_) => const HomeScreen()));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🔥', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            const Text('Ember', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(status, style: const TextStyle(color: Colors.white70)),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 2.2 소셜 로그인 (카카오)
// ══════════════════════════════════════
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String? message;
  bool loading = false;

  Future<void> _kakaoLogin() async {
    setState(() { loading = true; message = null; });
    final app = AppState();

    try {
      // 1. 카카오 SDK 로그인
      OAuthToken token;
      if (await isKakaoTalkInstalled()) {
        token = await UserApi.instance.loginWithKakaoTalk();
      } else {
        token = await UserApi.instance.loginWithKakaoAccount();
      }
      app.kakaoAccessToken = token.accessToken;
      setState(() => message = '카카오 로그인 성공');

      // 2. 서버 소셜 로그인
      final res = await app.dio.post('${app.baseUrl}/api/auth/social', data: {
        'provider': 'KAKAO',
        'socialToken': app.kakaoAccessToken,
      });
      final data = res.data['data'];
      app.accessToken = data['accessToken'];
      app.refreshToken = data['refreshToken'];
      app.userId = data['userId'];
      app.onboardingStep = data['onboardingStep'];
      app.onboardingCompleted = data['onboardingCompleted'];
      app.accountStatus = data['accountStatus'];
      app.restoreToken = data['restoreToken'];

      setState(() => message = '서버 로그인 성공! (userId=${data['userId']})');

      // 3. 분기
      if (mounted) {
        await Future.delayed(const Duration(milliseconds: 500));
        if (data['accountStatus'] == 'PENDING_DELETION') {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const RestoreScreen()));
        } else if (data['isNewUser'] == true) {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const ConsentScreen()));
        } else if (data['onboardingStep'] == 0) {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const ProfileSetupScreen()));
        } else if (data['onboardingStep'] == 1) {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const IdealTypeScreen()));
        } else {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const HomeScreen()));
        }
      }
    } catch (e) {
      setState(() { message = app.errMsg(e); loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🔥', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 8),
              const Text('Ember 시작하기', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('프로필 사진 없이, 내면을 먼저 보는 소개팅',
                style: TextStyle(color: Colors.white54), textAlign: TextAlign.center),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: loading ? null : _kakaoLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFEE500),
                    foregroundColor: Colors.black87,
                  ),
                  child: loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('카카오로 시작', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: loading ? null : () => _devLogin(8),
                  child: const Text('Dev 로그인 (건강한하늘)', style: TextStyle(fontSize: 14)),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: loading ? null : () => _devLogin(9),
                  child: const Text('Dev 로그인 (맑은바다)', style: TextStyle(fontSize: 14)),
                ),
              ),
              if (message != null) ...[
                const SizedBox(height: 16),
                Text(message!, style: TextStyle(
                  color: message!.contains('성공') ? Colors.greenAccent : Colors.redAccent,
                  fontSize: 13)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _devLogin(int userId) async {
    setState(() { loading = true; message = null; });
    final app = AppState();
    try {
      final res = await app.dio.get('${app.baseUrl}/api/dev/token', queryParameters: {'userId': userId});
      app.accessToken = res.data['accessToken'];
      app.userId = userId;
      setState(() => message = 'Dev 로그인 성공! (userId=$userId)');
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const HomeScreen()));
      }
    } catch (e) {
      setState(() { message = app.errMsg(e); loading = false; });
    }
  }
}

// ══════════════════════════════════════
// 2.2 약관 동의 (신규 가입)
// ══════════════════════════════════════
class ConsentScreen extends StatefulWidget {
  const ConsentScreen({super.key});

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  bool userTerms = false;
  bool aiTerms = false;
  String? message;

  Future<void> _submit() async {
    final app = AppState();
    try {
      if (userTerms) {
        await app.dio.post('${app.baseUrl}/api/consent',
          data: {'consentType': 'USER_TERMS'}, options: app.authHeaders);
      }
      if (aiTerms) {
        await app.dio.post('${app.baseUrl}/api/consent',
          data: {'consentType': 'AI_TERMS'}, options: app.authHeaders);
      }
      if (mounted) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const ProfileSetupScreen()));
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('약관 동의')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('서비스 이용을 위해\n약관에 동의해주세요',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 32),
            CheckboxListTile(
              title: const Text('서비스 이용약관 (필수)'),
              value: userTerms,
              onChanged: (v) => setState(() => userTerms = v!),
            ),
            CheckboxListTile(
              title: const Text('AI 분석 동의 (필수)'),
              value: aiTerms,
              onChanged: (v) => setState(() => aiTerms = v!),
            ),
            const Spacer(),
            if (message != null) Text(message!, style: const TextStyle(color: Colors.redAccent)),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: userTerms && aiTerms ? _submit : null,
                child: const Text('전체 동의 후 계속'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 2.6 계정 복구
// ══════════════════════════════════════
class RestoreScreen extends StatelessWidget {
  const RestoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppState();
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.warning_amber, size: 64, color: Colors.amber),
              const SizedBox(height: 16),
              const Text('탈퇴 유예 중인 계정', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    try {
                      final res = await app.dio.post('${app.baseUrl}/api/auth/restore',
                        data: {'restoreToken': app.restoreToken});
                      app.accessToken = res.data['data']['accessToken'];
                      app.refreshToken = res.data['data']['refreshToken'];
                      if (context.mounted) {
                        Navigator.pushReplacement(context,
                          MaterialPageRoute(builder: (_) => const HomeScreen()));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(app.errMsg(e))));
                      }
                    }
                  },
                  child: const Text('계정 복구'),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.pushReplacement(context,
                  MaterialPageRoute(builder: (_) => const LoginScreen())),
                child: const Text('탈퇴 진행', style: TextStyle(color: Colors.red)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 3.1 기본 프로필 설정
// ══════════════════════════════════════
class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final app = AppState();
  String nickname = '';
  final realNameCtrl = TextEditingController();
  final birthCtrl = TextEditingController(text: '2000-01-15');
  final schoolCtrl = TextEditingController();
  String gender = 'MALE';
  String sido = '경기도';
  String sigungu = '성남시';
  String? message;

  @override
  void initState() {
    super.initState();
    _generateNickname();
  }

  Future<void> _generateNickname() async {
    try {
      final res = await app.dio.post('${app.baseUrl}/api/users/nickname/generate');
      setState(() => nickname = res.data['data']['nickname']);
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  Future<void> _submit() async {
    try {
      await app.dio.post('${app.baseUrl}/api/users/profile',
        data: {
          'nickname': nickname,
          'realName': realNameCtrl.text,
          'birthDate': birthCtrl.text,
          'gender': gender,
          'sido': sido,
          'sigungu': sigungu,
          'school': schoolCtrl.text.isEmpty ? null : schoolCtrl.text,
        },
        options: app.authHeaders);
      if (mounted) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const IdealTypeScreen()));
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('프로필 설정 (1/2)')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('기본 프로필 설정', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            TextField(controller: realNameCtrl,
              decoration: const InputDecoration(labelText: '실명', border: OutlineInputBorder())),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: InputDecorator(
                decoration: const InputDecoration(labelText: '닉네임', border: OutlineInputBorder()),
                child: Text(nickname.isEmpty ? '생성 중...' : nickname))),
              const SizedBox(width: 8),
              ElevatedButton(onPressed: _generateNickname, child: const Text('다시 생성')),
            ]),
            const SizedBox(height: 16),
            TextField(controller: birthCtrl,
              decoration: const InputDecoration(labelText: '생년월일 (YYYY-MM-DD)', border: OutlineInputBorder())),
            const SizedBox(height: 16),
            const Text('성별'),
            Row(children: [
              ChoiceChip(label: const Text('남'), selected: gender == 'MALE',
                onSelected: (_) => setState(() => gender = 'MALE')),
              const SizedBox(width: 8),
              ChoiceChip(label: const Text('여'), selected: gender == 'FEMALE',
                onSelected: (_) => setState(() => gender = 'FEMALE')),
            ]),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(labelText: '시/도', border: OutlineInputBorder()),
              controller: TextEditingController(text: sido),
              onChanged: (v) => sido = v),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(labelText: '시/군/구', border: OutlineInputBorder()),
              controller: TextEditingController(text: sigungu),
              onChanged: (v) => sigungu = v),
            const SizedBox(height: 16),
            TextField(controller: schoolCtrl,
              decoration: const InputDecoration(labelText: '학교 (선택)', border: OutlineInputBorder())),
            const SizedBox(height: 24),
            if (message != null) Text(message!, style: const TextStyle(color: Colors.redAccent)),
            SizedBox(width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: nickname.isNotEmpty && realNameCtrl.text.isNotEmpty ? _submit : null,
                child: const Text('다음'))),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 3.2 이상형 키워드 설정
// ══════════════════════════════════════
class IdealTypeScreen extends StatefulWidget {
  const IdealTypeScreen({super.key});

  @override
  State<IdealTypeScreen> createState() => _IdealTypeScreenState();
}

class _IdealTypeScreenState extends State<IdealTypeScreen> {
  final app = AppState();
  List<dynamic> keywords = [];
  Set<int> selected = {};
  String? message;

  @override
  void initState() {
    super.initState();
    _loadKeywords();
  }

  Future<void> _loadKeywords() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/users/ideal-type/keyword-list');
      setState(() => keywords = res.data['data']['keywords']);
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  Future<void> _submit() async {
    try {
      await app.dio.post('${app.baseUrl}/api/users/ideal-type/keywords',
        data: {'keywordIds': selected.toList()}, options: app.authHeaders);
      if (mounted) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const TutorialScreen()));
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('이상형 설정 (2/2)')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('어떤 성격의 사람을\n원하시나요?',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('${selected.length}/3 선택됨', style: const TextStyle(color: Colors.white54)),
            const SizedBox(height: 24),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: keywords.map((k) {
                final id = k['id'] as int;
                final isSelected = selected.contains(id);
                return FilterChip(
                  label: Text(k['label']),
                  selected: isSelected,
                  onSelected: (v) {
                    setState(() {
                      if (v && selected.length < 3) selected.add(id);
                      else selected.remove(id);
                    });
                  },
                );
              }).toList(),
            ),
            const Spacer(),
            if (message != null) Text(message!, style: const TextStyle(color: Colors.redAccent)),
            SizedBox(width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: selected.isNotEmpty ? _submit : null,
                child: const Text('시작하기'))),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 3.3 튜토리얼
// ══════════════════════════════════════
class TutorialScreen extends StatelessWidget {
  const TutorialScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final pages = [
      {'icon': '📝', 'title': '매일 일기 쓰기', 'desc': '하루를 돌아보며 일기를 작성해보세요'},
      {'icon': '🤖', 'title': 'AI가 추천하는 상대', 'desc': 'AI가 성격을 분석하고 맞는 상대를 추천해줍니다'},
      {'icon': '📖', 'title': '교환 일기로 관계 형성', 'desc': '서로 일기를 교환하며 내면을 알아가세요'},
      {'icon': '💬', 'title': '채팅으로 만남', 'desc': '교환이 끝나면 채팅으로 더 가까워지세요'},
    ];

    return Scaffold(
      body: PageView.builder(
        itemCount: pages.length,
        itemBuilder: (context, index) {
          final page = pages[index];
          return Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // 인디케이터
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(pages.length, (i) => Container(
                    width: 8, height: 8,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i == index ? Colors.orange : Colors.white24),
                  )),
                ),
                const Spacer(),
                Text(page['icon']!, style: const TextStyle(fontSize: 64)),
                const SizedBox(height: 24),
                Text(page['title']!, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Text(page['desc']!, style: const TextStyle(color: Colors.white54), textAlign: TextAlign.center),
                const Spacer(),
                if (index == pages.length - 1)
                  SizedBox(width: double.infinity, height: 48,
                    child: ElevatedButton(
                      onPressed: () async {
                        final app = AppState();
                        try {
                          await app.dio.post('${app.baseUrl}/api/users/tutorial/complete',
                            options: app.authHeaders);
                        } catch (_) {}
                        if (context.mounted) {
                          Navigator.pushReplacement(context,
                            MaterialPageRoute(builder: (_) => const HomeScreen()));
                        }
                      },
                      child: const Text('시작하기')))
                else
                  const Text('스와이프하여 다음 →', style: TextStyle(color: Colors.white38)),
                TextButton(
                  onPressed: () {
                    Navigator.pushReplacement(context,
                      MaterialPageRoute(builder: (_) => const HomeScreen()));
                  },
                  child: const Text('건너뛰기', style: TextStyle(color: Colors.white38))),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ══════════════════════════════════════
// 홈 화면 (4탭 구조)
// ══════════════════════════════════════
class HomeScreen extends StatefulWidget {
  final int initialTab;
  const HomeScreen({super.key, this.initialTab = 0});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late int _currentTab = widget.initialTab;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentTab,
        children: const [
          DiaryUnifiedTab(),
          ExploreTab(),
          CommunicationTab(),
          MoreTab(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTab,
        onTap: (i) => setState(() => _currentTab = i),
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 10,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.auto_stories), label: '일기'),
          BottomNavigationBarItem(icon: Icon(Icons.explore), label: '탐색'),
          BottomNavigationBarItem(icon: Icon(Icons.forum), label: '소통'),
          BottomNavigationBarItem(icon: Icon(Icons.more_horiz), label: '더보기'),
        ],
      ),
    );
  }
}

// ── 일기 통합 탭 (작성 / 히스토리 / 임시저장) ──
class DiaryUnifiedTab extends StatefulWidget {
  const DiaryUnifiedTab({super.key});

  @override
  State<DiaryUnifiedTab> createState() => _DiaryUnifiedTabState();
}

class _DiaryUnifiedTabState extends State<DiaryUnifiedTab> {
  int _subIndex = 0; // 0=작성, 1=히스토리, 2=임시저장

  static const _labels = ['작성', '히스토리', '임시저장'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🔥 일기'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: SegmentedButton<int>(
              segments: List.generate(_labels.length, (i) =>
                ButtonSegment<int>(value: i, label: Text(_labels[i]))),
              selected: {_subIndex},
              onSelectionChanged: (s) => setState(() => _subIndex = s.first),
              style: const ButtonStyle(
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ),
        ),
      ),
      body: IndexedStack(
        index: _subIndex,
        children: const [
          _DiaryWriteBody(),
          _DiaryHistoryBody(),
          _DraftBody(),
        ],
      ),
    );
  }
}

// ── 소통 통합 탭 (교환일기 / 채팅) ──
class CommunicationTab extends StatefulWidget {
  const CommunicationTab({super.key});

  @override
  State<CommunicationTab> createState() => _CommunicationTabState();
}

class _CommunicationTabState extends State<CommunicationTab> {
  int _subIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('소통'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: SegmentedButton<int>(
              segments: const [
                ButtonSegment<int>(value: 0, label: Text('교환일기'), icon: Icon(Icons.swap_horiz, size: 16)),
                ButtonSegment<int>(value: 1, label: Text('채팅'), icon: Icon(Icons.chat_bubble, size: 16)),
              ],
              selected: {_subIndex},
              onSelectionChanged: (s) => setState(() => _subIndex = s.first),
              style: const ButtonStyle(
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ),
        ),
      ),
      body: IndexedStack(
        index: _subIndex,
        children: const [
          _ExchangeBody(),
          _ChatBody(),
        ],
      ),
    );
  }
}

// ── 일기 작성 바디 래퍼 (DiaryUnifiedTab 내부용) ──
class _DiaryWriteBody extends StatelessWidget {
  const _DiaryWriteBody();
  @override
  Widget build(BuildContext context) => const DiaryWriteTab(standaloneAppBar: false);
}

// ── 4.1 일기 작성 탭 ──
class DiaryWriteTab extends StatefulWidget {
  final bool standaloneAppBar;
  const DiaryWriteTab({super.key, this.standaloneAppBar = true});

  @override
  State<DiaryWriteTab> createState() => _DiaryWriteTabState();
}

class _DiaryWriteTabState extends State<DiaryWriteTab> {
  final app = AppState();
  final contentCtrl = TextEditingController();
  bool? todayExists;
  int? todayDiaryId;
  String? message;
  bool isEdit = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await _checkToday();
    // 오늘 일기가 없으면 임시저장 확인
    if (todayExists != true) {
      await _checkDrafts();
    }
  }

  Future<void> _checkToday() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries/today', options: app.authHeaders);
      final data = res.data['data'];
      setState(() {
        todayExists = data['exists'];
        todayDiaryId = data['diaryId'];
      });
      if (todayExists == true && todayDiaryId != null) {
        // 기존 일기 로드
        final detail = await app.dio.get('${app.baseUrl}/api/diaries/$todayDiaryId', options: app.authHeaders);
        contentCtrl.text = detail.data['data']['content'];
        setState(() => isEdit = detail.data['data']['isEditable']);
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  Future<void> _checkDrafts() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries/drafts', options: app.authHeaders);
      final drafts = res.data['data']['drafts'] as List;
      if (drafts.isNotEmpty && mounted) {
        final latest = drafts.first;
        final result = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('임시저장된 일기가 있어요'),
            content: Text('${latest['content'].toString().substring(0, latest['content'].toString().length > 50 ? 50 : latest['content'].toString().length)}...\n\n이어서 작성하시겠어요?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('새로 시작')),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('이어쓰기')),
            ],
          ),
        );
        if (result == true) {
          contentCtrl.text = latest['content'];
          setState(() {});
        }
      }
    } catch (_) {}
  }

  Future<void> _submit() async {
    try {
      if (todayExists == true && todayDiaryId != null) {
        // 수정
        await app.dio.patch('${app.baseUrl}/api/diaries/$todayDiaryId',
          data: {'content': contentCtrl.text}, options: app.authHeaders);
        setState(() => message = '일기 수정 완료!');
      } else {
        // 작성
        final res = await app.dio.post('${app.baseUrl}/api/diaries',
          data: {'content': contentCtrl.text, 'visibility': 'PRIVATE'}, options: app.authHeaders);
        setState(() {
          message = '일기 작성 완료! (id=${res.data['data']['diaryId']})';
          todayExists = true;
          todayDiaryId = res.data['data']['diaryId'];
        });
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  Future<void> _saveDraft() async {
    try {
      await app.dio.post('${app.baseUrl}/api/diaries/draft',
        data: {'content': contentCtrl.text}, options: app.authHeaders);
      setState(() => message = '임시저장 완료!');
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final charCount = contentCtrl.text.length;

    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(
        title: Text('${now.month}월 ${now.day}일 (${['월','화','수','목','금','토','일'][now.weekday - 1]})'),
        actions: [
          if (todayExists == true)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Chip(label: Text('작성됨', style: TextStyle(fontSize: 11))),
            ),
        ],
      ) : null,
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Expanded(
              child: TextField(
                controller: contentCtrl,
                maxLines: null,
                expands: true,
                textAlignVertical: TextAlignVertical.top,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: '오늘 하루를 돌아보며 일기를 써보세요... (200~1,000자)',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text('$charCount / 1000자',
                  style: TextStyle(
                    color: charCount >= 200 && charCount <= 1000
                      ? Colors.greenAccent : Colors.redAccent)),
                const Spacer(),
                TextButton(onPressed: _saveDraft, child: const Text('임시저장')),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: charCount >= 200 && charCount <= 1000
                    ? _submit : null,
                  child: Text(todayExists == true ? '수정' : '제출')),
              ],
            ),
            if (message != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(message!, style: TextStyle(
                  color: message!.contains('완료') ? Colors.greenAccent : Colors.redAccent)),
              ),
          ],
        ),
      ),
    );
  }
}

// ── 일기 히스토리 바디 래퍼 ──
class _DiaryHistoryBody extends StatelessWidget {
  const _DiaryHistoryBody();
  @override
  Widget build(BuildContext context) => const DiaryHistoryTab(standaloneAppBar: false);
}

// ── 4.4 일기 히스토리 탭 ──
class DiaryHistoryTab extends StatefulWidget {
  final bool standaloneAppBar;
  const DiaryHistoryTab({super.key, this.standaloneAppBar = true});

  @override
  State<DiaryHistoryTab> createState() => _DiaryHistoryTabState();
}

class _DiaryHistoryTabState extends State<DiaryHistoryTab> {
  final app = AppState();
  List<dynamic> diaries = [];
  String? message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries', options: app.authHeaders);
      setState(() => diaries = res.data['data']['diaries']);
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(title: const Text('나의 일기')) : null,
      body: diaries.isEmpty
        ? Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.book_outlined, size: 64, color: Colors.white24),
              const SizedBox(height: 12),
              Text(message ?? '아직 일기가 없어요', style: const TextStyle(color: Colors.white54)),
              const SizedBox(height: 8),
              const Text('오늘의 일기를 작성해보세요', style: TextStyle(color: Colors.white38, fontSize: 13)),
            ],
          ))
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: diaries.length,
              itemBuilder: (context, index) {
                final d = diaries[index];
                return Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    title: Text(d['contentPreview'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                    subtitle: Row(children: [
                      Text(d['createdAt']?.toString().substring(0, 10) ?? ''),
                      if (d['summary'] != null) ...[
                        const SizedBox(width: 8),
                        Chip(label: Text(d['category'] ?? '', style: const TextStyle(fontSize: 10))),
                      ],
                    ]),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      try {
                        final res = await app.dio.get(
                          '${app.baseUrl}/api/diaries/${d['diaryId']}', options: app.authHeaders);
                        if (context.mounted) {
                          Navigator.push(context, MaterialPageRoute(
                            builder: (_) => DiaryDetailScreen(diary: res.data['data'])));
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(app.errMsg(e))));
                        }
                      }
                    },
                  ),
                );
              },
            ),
          ),
    );
  }
}

// ── 4.4 일기 상세 ──
class DiaryDetailScreen extends StatelessWidget {
  final Map<String, dynamic> diary;
  const DiaryDetailScreen({super.key, required this.diary});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(diary['createdAt']?.toString().substring(0, 10) ?? ''),
        actions: [
          if (diary['isEditable'] == true)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Chip(label: Text('수정 가능', style: TextStyle(fontSize: 11, color: Colors.greenAccent))),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(diary['content'] ?? '', style: const TextStyle(fontSize: 16, height: 1.6)),
            const Divider(height: 32),
            if (diary['summary'] != null)
              _tag('AI 요약', diary['summary']),
            if (diary['category'] != null)
              _tag('카테고리', diary['category']),
            if (diary['emotionTags'] != null)
              _tagList('감정', diary['emotionTags']),
            if (diary['lifestyleTags'] != null)
              _tagList('라이프스타일', diary['lifestyleTags']),
            if (diary['toneTags'] != null)
              _tagList('글쓰기 톤', diary['toneTags']),
            if (diary['summary'] == null)
              const Text('AI 분석 대기 중...', style: TextStyle(color: Colors.white38)),
          ],
        ),
      ),
    );
  }

  Widget _tag(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(children: [
      Text('$label: ', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
      Expanded(child: Text(value)),
    ]),
  );

  Widget _tagList(String label, List<dynamic> tags) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
        const SizedBox(height: 4),
        Wrap(spacing: 6, children: tags.map((t) =>
          Chip(label: Text('${t['label']}', style: const TextStyle(fontSize: 12)))).toList()),
      ],
    ),
  );
}

// ── 임시저장 바디 래퍼 ──
class _DraftBody extends StatelessWidget {
  const _DraftBody();
  @override
  Widget build(BuildContext context) => const DraftTab(standaloneAppBar: false);
}

// ── 임시저장 탭 ──
class DraftTab extends StatefulWidget {
  final bool standaloneAppBar;
  const DraftTab({super.key, this.standaloneAppBar = true});

  @override
  State<DraftTab> createState() => _DraftTabState();
}

class _DraftTabState extends State<DraftTab> {
  final app = AppState();
  List<dynamic> drafts = [];
  String? message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries/drafts', options: app.authHeaders);
      setState(() => drafts = res.data['data']['drafts']);
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(title: Text('임시저장 (${drafts.length}/3)')) : null,
      body: drafts.isEmpty
        ? Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.drafts_outlined, size: 64, color: Colors.white24),
              const SizedBox(height: 12),
              Text(message ?? '임시저장된 일기가 없어요', style: const TextStyle(color: Colors.white54)),
            ],
          ))
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: drafts.length,
              itemBuilder: (context, index) {
                final d = drafts[index];
                return Dismissible(
                  key: Key('${d['draftId']}'),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    color: Colors.red, alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    child: const Icon(Icons.delete, color: Colors.white)),
                  onDismissed: (_) async {
                    try {
                      await app.dio.delete(
                        '${app.baseUrl}/api/diaries/draft/${d['draftId']}', options: app.authHeaders);
                      _load();
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(app.errMsg(e))));
                      }
                    }
                  },
                  child: Card(
                    child: ListTile(
                      title: Text(d['content'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                      subtitle: Text(d['savedAt']?.toString().substring(0, 16) ?? ''),
                      trailing: const Text('← 밀어서 삭제', style: TextStyle(fontSize: 10, color: Colors.white38)),
                    ),
                  ),
                );
              },
            ),
          ),
    );
  }
}

// ══════════════════════════════════════
// 도메인 5. 매칭 탐색
// ══════════════════════════════════════

// ── 5.1 일기 탐색 탭 ──
class ExploreTab extends StatefulWidget {
  const ExploreTab({super.key});

  @override
  State<ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<ExploreTab> {
  final app = AppState();
  List<dynamic> diaries = [];
  int? nextCursor;
  bool loading = false;
  String? message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries/explore',
        options: app.authHeaders,
        queryParameters: nextCursor != null ? {'cursor': nextCursor} : null);
      final data = res.data['data'];
      setState(() {
        diaries = data['diaries'] ?? [];
        nextCursor = data['nextCursor'];
        message = data['guidanceMessage'];
        loading = false;
      });
    } catch (e) {
      setState(() { message = app.errMsg(e); loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('일기 탐색'),
        actions: [
          IconButton(icon: const Icon(Icons.mail), onPressed: _showReceivedRequests),
          IconButton(icon: const Icon(Icons.analytics), onPressed: _showLifestyleReport),
        ],
      ),
      body: loading
        ? const Center(child: CircularProgressIndicator())
        : diaries.isEmpty
          ? Center(child: Text(message ?? '탐색할 일기가 없습니다', style: const TextStyle(color: Colors.white54)))
          : RefreshIndicator(
              onRefresh: () async { nextCursor = null; await _load(); },
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: diaries.length,
                itemBuilder: (context, index) {
                  final d = diaries[index];
                  return Card(
                    child: ListTile(
                      title: Text(d['previewContent'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                      subtitle: Row(children: [
                        Text('${d['ageGroupLabel'] ?? ''} · ${d['region'] ?? ''}'),
                        if (d['similarityBadge'] != null) ...[
                          const SizedBox(width: 8),
                          Chip(label: Text(d['similarityBadge'], style: const TextStyle(fontSize: 10))),
                        ],
                      ]),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => _showDiaryDetail(d),
                    ),
                  );
                },
              ),
            ),
    );
  }

  void _showDiaryDetail(Map<String, dynamic> d) async {
    try {
      final res = await app.dio.get(
        '${app.baseUrl}/api/matching/recommendations/${d['diaryId']}/preview',
        options: app.authHeaders);
      if (context.mounted) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => ExploreDetailScreen(
            diaryId: d['diaryId'],
            preview: res.data['data'])));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }

  void _showReceivedRequests() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/matching/requests',
        options: app.authHeaders);
      if (context.mounted) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => ReceivedRequestsScreen(requests: res.data['data'] ?? [])));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }

  void _showLifestyleReport() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/matching/lifestyle-report',
        options: app.authHeaders);
      if (context.mounted) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => LifestyleReportScreen(data: res.data['data'])));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }
}

// ── 5.2 블라인드 미리보기 + 5.4 선택/넘기기 ──
// ── 받은 매칭 요청 화면 ──
class ReceivedRequestsScreen extends StatefulWidget {
  final List<dynamic> requests;
  const ReceivedRequestsScreen({super.key, required this.requests});

  @override
  State<ReceivedRequestsScreen> createState() => _ReceivedRequestsScreenState();
}

class _ReceivedRequestsScreenState extends State<ReceivedRequestsScreen> {
  final app = AppState();
  late List<dynamic> requests;

  @override
  void initState() {
    super.initState();
    requests = widget.requests;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('받은 요청 (${requests.length})')),
      body: requests.isEmpty
        ? const Center(child: Text('받은 매칭 요청이 없습니다', style: TextStyle(color: Colors.white54)))
        : ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: requests.length,
            itemBuilder: (context, index) {
              final r = requests[index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text('${r['fromUserNickname'] ?? '익명'} (${r['fromUserAgeGroup'] ?? ''})'),
                  subtitle: Text(r['diaryPreview'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.check_circle, color: Colors.greenAccent),
                        onPressed: () => _accept(r['matchingId'], index),
                      ),
                      IconButton(
                        icon: const Icon(Icons.cancel, color: Colors.redAccent),
                        onPressed: () => _reject(index),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
    );
  }

  void _accept(int matchingId, int index) async {
    try {
      final res = await app.dio.post(
        '${app.baseUrl}/api/matching/requests/$matchingId/accept',
        options: app.authHeaders);
      final data = res.data['data'];
      setState(() => requests.removeAt(index));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('매칭 성사! 교환일기 방으로 이동합니다.'),
          duration: Duration(seconds: 2)));
        // 매칭 성사 시 교환일기 탭으로 이동 (홈 재진입)
        Navigator.pushAndRemoveUntil(context,
          MaterialPageRoute(builder: (_) => const HomeScreen(initialTab: 2)),
          (_) => false);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }

  void _reject(int index) {
    setState(() => requests.removeAt(index));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('요청을 거절했습니다')));
  }
}

// ── 5.2 블라인드 미리보기 + 5.4 선택/넘기기 ──
class ExploreDetailScreen extends StatelessWidget {
  final int diaryId;
  final Map<String, dynamic> preview;
  const ExploreDetailScreen({super.key, required this.diaryId, required this.preview});

  @override
  Widget build(BuildContext context) {
    final app = AppState();
    return Scaffold(
      appBar: AppBar(title: Text('${preview['ageGroup'] ?? ''} · 일기 미리보기')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(preview['preview'] ?? '', style: const TextStyle(fontSize: 16, height: 1.6)),
            const SizedBox(height: 16),
            if (preview['aiIntro'] != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8)),
                child: Text('AI: ${preview['aiIntro']}', style: const TextStyle(color: Colors.orange)),
              ),
            const SizedBox(height: 12),
            if (preview['keywords'] != null)
              Wrap(spacing: 6, children: (preview['keywords'] as List).map((k) =>
                Chip(label: Text(k, style: const TextStyle(fontSize: 12)))).toList()),
            if (preview['tags'] != null)
              Wrap(spacing: 6, children: (preview['tags'] as List).map((t) =>
                Chip(label: Text('#$t', style: const TextStyle(fontSize: 11)),
                  backgroundColor: Colors.deepPurple)).toList()),
            const SizedBox(height: 12),
            if (preview['category'] != null)
              Text('카테고리: ${preview['category']}', style: const TextStyle(color: Colors.white54)),
            if (preview['matchScore'] != null)
              Text('유사도: ${(preview['matchScore'] * 100).toStringAsFixed(0)}%',
                style: const TextStyle(color: Colors.greenAccent)),
          ],
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.skip_next),
              label: const Text('다음 일기'),
              onPressed: () async {
                try {
                  await app.dio.post('${app.baseUrl}/api/matching/$diaryId/skip',
                    options: app.authHeaders);
                  if (context.mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('넘기기 완료 (7일간 재추천 제외)')));
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
                  }
                }
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              icon: const Icon(Icons.mail_outline),
              label: const Text('교환 신청'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.deepOrange),
              onPressed: () async {
                try {
                  final res = await app.dio.post('${app.baseUrl}/api/matching/$diaryId/select',
                    options: app.authHeaders);
                  final data = res.data['data'];
                  if (context.mounted) {
                    if (data['isMatched'] == true) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                        content: Text('매칭 성사! 교환일기 방으로 이동합니다.'),
                        duration: Duration(seconds: 2)));
                      Navigator.pushAndRemoveUntil(context,
                        MaterialPageRoute(builder: (_) => const HomeScreen()),
                        (_) => false);
                    } else {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text('교환 신청 완료! 상대방 응답을 기다려주세요 (id: ${data['matchingId']})'),
                        duration: const Duration(seconds: 3)));
                    }
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
                  }
                }
              },
            ),
          ),
        ]),
      ),
    );
  }
}

// ── 5.3 라이프스타일 리포트 ──
class LifestyleReportScreen extends StatelessWidget {
  final Map<String, dynamic> data;
  const LifestyleReportScreen({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final available = data['analysisAvailable'] == true;
    return Scaffold(
      appBar: AppBar(title: const Text('나의 라이프 리포트')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: available ? _buildReport() : _buildUnavailable(),
      ),
    );
  }

  Widget _buildUnavailable() {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.analytics_outlined, size: 64, color: Colors.white38),
        const SizedBox(height: 16),
        Text(data['guidanceMessage'] ?? '일기를 더 작성해주세요',
          style: const TextStyle(fontSize: 16, color: Colors.white54)),
        const SizedBox(height: 8),
        Text('현재 ${data['currentDiaryCount']}편 / 필요 ${data['requiredDiaryCount']}편',
          style: const TextStyle(color: Colors.white38)),
      ]),
    );
  }

  Widget _buildReport() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _section('평균 일기 길이', '${data['avgDiaryLength'] ?? 0}자'),
      if (data['weekdayPattern'] != null)
        _section('작성 패턴', '평일 ${data['weekdayPattern']['weekday']}편 / 주말 ${data['weekdayPattern']['weekend']}편'),
      if (data['commonKeywords'] != null && (data['commonKeywords'] as List).isNotEmpty)
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('자주 쓰는 키워드', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
          const SizedBox(height: 8),
          Wrap(spacing: 6, children: (data['commonKeywords'] as List).map((k) =>
            Chip(label: Text('#$k', style: const TextStyle(fontSize: 12)))).toList()),
          const SizedBox(height: 16),
        ]),
      if (data['lifestyleTags'] != null && (data['lifestyleTags'] as List).isNotEmpty)
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('라이프스타일 태그', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
          const SizedBox(height: 8),
          Wrap(spacing: 6, children: (data['lifestyleTags'] as List).map((t) =>
            Chip(label: Text(t, style: const TextStyle(fontSize: 12)),
              backgroundColor: Colors.teal)).toList()),
        ]),
      if (data['aiDescription'] != null) ...[
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8)),
          child: Text('AI 분석: ${data['aiDescription']}', style: const TextStyle(color: Colors.orange)),
        ),
      ],
    ]);
  }

  Widget _section(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Row(children: [
      Text('$label: ', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
      Text(value, style: const TextStyle(fontSize: 16)),
    ]),
  );
}

// ── 더보기 탭 (설정 + Redis 모니터링) ──
class MoreTab extends StatefulWidget {
  const MoreTab({super.key});

  @override
  State<MoreTab> createState() => _MoreTabState();
}

// 하위 호환을 위해 SettingsTab 유지
typedef SettingsTab = MoreTab;

class _MoreTabState extends State<MoreTab> {
  final app = AppState();

  void _snack(String msg) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void _showJson(String title, dynamic data) {
    if (!mounted) return;
    showDialog(context: context, builder: (_) => AlertDialog(
      title: Text(title),
      content: SingleChildScrollView(
        child: Text(const JsonEncoder.withIndent('  ').convert(data), style: const TextStyle(fontSize: 12)),
      ),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('닫기'))],
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('더보기')),
      body: ListView(
        children: [
          // ── 프로필 ──
          const Padding(padding: EdgeInsets.all(12), child: Text('프로필', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('내 프로필'), leading: const Icon(Icons.person),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me', options: app.authHeaders);
                _showJson('내 프로필', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('AI 프로필 (성격 분석)'), leading: const Icon(Icons.psychology),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/ai-profile', options: app.authHeaders);
                _showJson('AI 프로필', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('이상형 키워드'), leading: const Icon(Icons.favorite),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/ideal-type', options: app.authHeaders);
                _showJson('이상형 키워드', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),

          // ── 알림 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('알림', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('알림 목록'), leading: const Icon(Icons.notifications),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/notifications', options: app.authHeaders);
                _showJson('알림 (미읽음: ${res.data['data']['unreadCount']})', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('전체 읽음 처리'), leading: const Icon(Icons.done_all),
            onTap: () async {
              try {
                final res = await app.dio.patch('${app.baseUrl}/api/notifications/read-all', options: app.authHeaders);
                _snack('읽음 처리: ${res.data['data']['updatedCount']}건');
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('알림 설정'), leading: const Icon(Icons.notifications_active),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/notification-settings', options: app.authHeaders);
                _showJson('알림 설정', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('알림 설정 수정 (채팅 OFF)'), leading: const Icon(Icons.toggle_off),
            onTap: () async {
              try {
                final res = await app.dio.patch('${app.baseUrl}/api/users/me/notification-settings',
                  data: {'chat': false}, options: app.authHeaders);
                _showJson('알림 설정 변경됨', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),

          // ── 신고/차단 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('신고/차단', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('차단 목록'), leading: const Icon(Icons.block),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/block-list', options: app.authHeaders);
                _showJson('차단 목록', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('사용자 신고 (상대방)'), leading: const Icon(Icons.report),
            onTap: () => _showReportDialog(),
          ),
          ListTile(
            title: const Text('사용자 차단 (상대방)'), leading: const Icon(Icons.person_off),
            onTap: () => _showBlockDialog(),
          ),

          // ── 히스토리 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('히스토리', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('교환일기 히스토리'), leading: const Icon(Icons.history),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/history/exchange-rooms', options: app.authHeaders);
                _showJson('교환일기 히스토리', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('채팅 히스토리'), leading: const Icon(Icons.chat_bubble_outline),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/history/chat-rooms', options: app.authHeaders);
                _showJson('채팅 히스토리', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),

          // ── AI 테스트 (Dev) ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('AI 파이프라인 (Dev)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.amber))),
          ListTile(
            title: const Text('AI 분석 시뮬레이션'), leading: const Icon(Icons.science, color: Colors.amber),
            subtitle: const Text('diaryId 입력 -> 가짜 AI 결과 생성'),
            onTap: () => _showAiSimulateDialog(),
          ),

          // ── Redis 모니터링 (Dev) ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('Redis 캐시 (Dev)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.amber))),
          ListTile(
            title: const Text('캐시 요약'), leading: const Icon(Icons.dashboard, color: Colors.amber),
            subtitle: const Text('전체 캐시 키 수/메모리 현황'),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/dev/redis/summary');
                _showJson('Redis 요약', res.data);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('내 캐시 현황'), leading: const Icon(Icons.person_search, color: Colors.amber),
            subtitle: const Text('내 userId 기준 캐시 키 목록'),
            onTap: () async {
              if (app.userId == null) { _snack('로그인 후 이용하세요'); return; }
              try {
                final res = await app.dio.get('${app.baseUrl}/api/dev/redis/user/${app.userId}');
                _showJson('내 캐시 (userId=${app.userId})', res.data);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('키 직접 조회'), leading: const Icon(Icons.search, color: Colors.amber),
            subtitle: const Text('key 입력 → 값 조회'),
            onTap: () => _showRedisGetDialog(),
          ),
          ListTile(
            title: const Text('키 삭제'), leading: const Icon(Icons.delete_outline, color: Colors.amber),
            subtitle: const Text('key 입력 → 캐시 삭제'),
            onTap: () => _showRedisDeleteDialog(),
          ),
          ListTile(
            title: const Text('패턴 검색'), leading: const Icon(Icons.filter_list, color: Colors.amber),
            subtitle: const Text('pattern 입력 (예: AI:DIARY:*) → 키 목록'),
            onTap: () => _showRedisPatternDialog(),
          ),

          // ── 앱 설정 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('앱 설정', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('다크모드 ON'), leading: const Icon(Icons.dark_mode),
            onTap: () async {
              try {
                final res = await app.dio.patch('${app.baseUrl}/api/users/me/settings',
                  data: {'darkMode': true}, options: app.authHeaders);
                _showJson('앱 설정', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),

          // ── 공지/FAQ ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('공지/지원', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('공지사항'), leading: const Icon(Icons.campaign),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/notices', options: app.authHeaders);
                _showJson('공지사항', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('FAQ'), leading: const Icon(Icons.help),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/faq', options: app.authHeaders);
                _showJson('FAQ', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('1:1 문의 접수'), leading: const Icon(Icons.support_agent),
            onTap: () => _showInquiryDialog(),
          ),
          ListTile(
            title: const Text('내 문의 목록'), leading: const Icon(Icons.list_alt),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/support/inquiries', options: app.authHeaders);
                _showJson('내 문의 목록', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),

          // ── 계정 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('계정', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('토큰 갱신'), leading: const Icon(Icons.refresh),
            onTap: () async {
              try {
                final res = await app.dio.post('${app.baseUrl}/api/auth/refresh',
                  data: {'refreshToken': app.refreshToken});
                app.accessToken = res.data['data']['accessToken'];
                app.refreshToken = res.data['data']['refreshToken'];
                _snack('토큰 갱신 성공!');
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('로그아웃', style: TextStyle(color: Colors.red)),
            leading: const Icon(Icons.logout, color: Colors.red),
            onTap: () {
              showDialog(context: context, builder: (_) => AlertDialog(
                title: const Text('로그아웃'),
                content: const Text('정말 로그아웃 하시겠어요?'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
                  TextButton(
                    onPressed: () async {
                      try {
                        await app.dio.post('${app.baseUrl}/api/auth/logout', options: app.authHeaders);
                      } catch (_) {}
                      app.accessToken = null;
                      app.refreshToken = null;
                      if (context.mounted) {
                        Navigator.pop(context);
                        Navigator.pushAndRemoveUntil(context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (_) => false);
                      }
                    },
                    child: const Text('로그아웃', style: TextStyle(color: Colors.red))),
                ],
              ));
            },
          ),
          ListTile(
            title: const Text('계정 복구 (탈퇴 유예 중일 때)'), leading: const Icon(Icons.restore),
            onTap: () async {
              try {
                final res = await app.dio.post('${app.baseUrl}/api/users/me/restore', options: app.authHeaders);
                _showJson('계정 복구', res.data['data']);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('회원 탈퇴 (30일 유예)', style: TextStyle(color: Colors.red)),
            leading: const Icon(Icons.delete_forever, color: Colors.red),
            onTap: () {
              showDialog(context: context, builder: (_) => AlertDialog(
                title: const Text('회원 탈퇴'),
                content: const Text('30일 유예 기간 후 영구 삭제됩니다.\n정말 탈퇴하시겠어요?'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
                  TextButton(
                    onPressed: () async {
                      Navigator.pop(context);
                      try {
                        final res = await app.dio.post('${app.baseUrl}/api/users/me/deactivate',
                          data: {'reason': 'SERVICE_DISSATISFACTION'}, options: app.authHeaders);
                        _showJson('탈퇴 처리', res.data['data']);
                      } catch (e) { _snack(app.errMsg(e)); }
                    },
                    child: const Text('탈퇴', style: TextStyle(color: Colors.red))),
                ],
              ));
            },
          ),
        ],
      ),
    );
  }

  void _showReportDialog() {
    final targetCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('사용자 신고'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: targetCtrl, decoration: const InputDecoration(labelText: '대상 userId'), keyboardType: TextInputType.number),
        const SizedBox(height: 8),
        const Text('사유: HARASSMENT', style: TextStyle(fontSize: 12, color: Colors.grey)),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final targetId = targetCtrl.text.trim();
          if (targetId.isEmpty) return;
          try {
            final res = await app.dio.post('${app.baseUrl}/api/users/$targetId/report',
              data: {'reason': 'HARASSMENT'}, options: app.authHeaders);
            _snack('신고 접수 완료: ID=${res.data['data']['reportId']}');
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('신고')),
      ],
    ));
  }

  void _showBlockDialog() {
    final targetCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('사용자 차단'),
      content: TextField(controller: targetCtrl, decoration: const InputDecoration(labelText: '대상 userId'), keyboardType: TextInputType.number),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final targetId = targetCtrl.text.trim();
          if (targetId.isEmpty) return;
          try {
            await app.dio.post('${app.baseUrl}/api/users/$targetId/block', options: app.authHeaders);
            _snack('차단 완료');
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('차단', style: TextStyle(color: Colors.red))),
      ],
    ));
  }

  void _showAiSimulateDialog() {
    final diaryIdCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('AI 분석 시뮬레이션'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: diaryIdCtrl, decoration: const InputDecoration(labelText: 'diaryId'), keyboardType: TextInputType.number),
        const SizedBox(height: 8),
        const Text('AI 서버 없이 가짜 분석 결과를 생성합니다.\n2~3초 후 일기 상세에서 AI 태그를 확인하세요.', style: TextStyle(fontSize: 12, color: Colors.grey)),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final diaryId = diaryIdCtrl.text.trim();
          if (diaryId.isEmpty) return;
          try {
            final res = await app.dio.post('${app.baseUrl}/api/dev/ai/simulate/$diaryId');
            _showJson('AI 시뮬레이션', res.data);
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('실행', style: TextStyle(color: Colors.amber))),
      ],
    ));
  }

  void _showInquiryDialog() {
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('1:1 문의'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: '제목 (5자 이상)')),
        const SizedBox(height: 8),
        TextField(controller: contentCtrl, decoration: const InputDecoration(labelText: '내용 (10자 이상)'), maxLines: 3),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          try {
            final res = await app.dio.post('${app.baseUrl}/api/support/inquiry',
              data: {'category': 'ACCOUNT', 'title': titleCtrl.text, 'content': contentCtrl.text},
              options: app.authHeaders);
            _snack('문의 접수 완료: ID=${res.data['data']['inquiryId']}');
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('제출')),
      ],
    ));
  }

  void _showRedisGetDialog() {
    final keyCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('Redis 키 조회'),
      content: TextField(controller: keyCtrl, decoration: const InputDecoration(labelText: 'key (예: AI:DIARY:123)')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final key = keyCtrl.text.trim();
          if (key.isEmpty) return;
          try {
            final res = await app.dio.get('${app.baseUrl}/api/dev/redis/get',
              queryParameters: {'key': key});
            _showJson('Redis [$key]', res.data);
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('조회', style: TextStyle(color: Colors.amber))),
      ],
    ));
  }

  void _showRedisDeleteDialog() {
    final keyCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('Redis 키 삭제'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: keyCtrl, decoration: const InputDecoration(labelText: 'key')),
        const SizedBox(height: 8),
        const Text('삭제 후 복구 불가', style: TextStyle(fontSize: 12, color: Colors.redAccent)),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final key = keyCtrl.text.trim();
          if (key.isEmpty) return;
          try {
            final res = await app.dio.delete('${app.baseUrl}/api/dev/redis/delete',
              queryParameters: {'key': key});
            _showJson('삭제 결과', res.data);
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('삭제', style: TextStyle(color: Colors.redAccent))),
      ],
    ));
  }

  void _showRedisPatternDialog() {
    final patternCtrl = TextEditingController(text: '*');
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('Redis 패턴 검색'),
      content: TextField(controller: patternCtrl, decoration: const InputDecoration(labelText: 'pattern (예: AI:DIARY:*)')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final pattern = patternCtrl.text.trim();
          if (pattern.isEmpty) return;
          try {
            final res = await app.dio.get('${app.baseUrl}/api/dev/redis/keys',
              queryParameters: {'pattern': pattern});
            _showJson('패턴 [$pattern] 결과', res.data);
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('검색', style: TextStyle(color: Colors.amber))),
      ],
    ));
  }
}

// ── 교환일기 바디 래퍼 ──
class _ExchangeBody extends StatelessWidget {
  const _ExchangeBody();
  @override
  Widget build(BuildContext context) => const ExchangeTab(standaloneAppBar: false);
}

// ── 채팅 바디 래퍼 ──
class _ChatBody extends StatelessWidget {
  const _ChatBody();
  @override
  Widget build(BuildContext context) => const ChatTab(standaloneAppBar: false);
}

// ══════════════════════════════════════
// 6. 교환일기 탭
// ══════════════════════════════════════
class ExchangeTab extends StatefulWidget {
  final bool standaloneAppBar;
  const ExchangeTab({super.key, this.standaloneAppBar = true});

  @override
  State<ExchangeTab> createState() => _ExchangeTabState();
}

class _ExchangeTabState extends State<ExchangeTab> {
  final app = AppState();
  List<dynamic> rooms = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final res = await app.dio.get('${app.baseUrl}/api/exchange-rooms', options: app.authHeaders);
      setState(() {
        rooms = res.data['data']['rooms'] ?? [];
        loading = false;
      });
    } catch (e) {
      setState(() => loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(title: const Text('교환일기')) : null,
      body: loading
        ? const Center(child: CircularProgressIndicator())
        : rooms.isEmpty
          ? Center(child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.swap_horiz, size: 64, color: Colors.white24),
                SizedBox(height: 12),
                Text('진행 중인 교환일기가 없어요', style: TextStyle(color: Colors.white54)),
                SizedBox(height: 8),
                Text('탐색 탭에서 매칭을 시작해보세요!', style: TextStyle(color: Colors.white38, fontSize: 13)),
              ],
            ))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                itemCount: rooms.length,
                itemBuilder: (_, i) => _buildRoomCard(rooms[i]),
              ),
            ),
    );
  }

  Widget _buildRoomCard(Map<String, dynamic> room) {
    final status = room['status'] as String;
    final isMyTurn = room['isMyTurn'] == true;
    final turn = room['currentTurn'] ?? 0;
    final partner = room['partnerNickname'] ?? '???';

    Color statusColor = Colors.grey;
    String statusText = status;
    if (status == 'ACTIVE') {
      statusColor = isMyTurn ? Colors.orangeAccent : Colors.blueAccent;
      statusText = isMyTurn ? '내 차례' : '상대 차례';
    } else if (status == 'COMPLETED') {
      statusColor = Colors.greenAccent;
      statusText = '완주! 관계 확장 선택';
    } else if (status == 'EXPIRED') {
      statusColor = Colors.redAccent;
      statusText = '만료됨';
    } else if (status == 'CHAT_CONNECTED') {
      statusColor = Colors.purpleAccent;
      statusText = '채팅 연결됨';
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Text('$turn/4', style: TextStyle(color: statusColor, fontWeight: FontWeight.bold)),
        ),
        title: Text(partner, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(statusText, style: TextStyle(color: statusColor, fontSize: 13)),
        trailing: room['deadline'] != null
          ? Text(_formatDeadline(room['deadline']), style: const TextStyle(fontSize: 11, color: Colors.white54))
          : null,
        onTap: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => ExchangeRoomScreen(roomId: room['roomId']))),
      ),
    );
  }

  String _formatDeadline(String deadline) {
    try {
      final dt = DateTime.parse(deadline);
      final diff = dt.difference(DateTime.now());
      if (diff.isNegative) return '만료';
      if (diff.inHours > 0) return '${diff.inHours}시간 남음';
      return '${diff.inMinutes}분 남음';
    } catch (_) {
      return '';
    }
  }
}

// ── 교환일기 방 상세 화면 ──
class ExchangeRoomScreen extends StatefulWidget {
  final int roomId;
  const ExchangeRoomScreen({super.key, required this.roomId});

  @override
  State<ExchangeRoomScreen> createState() => _ExchangeRoomScreenState();
}

class _ExchangeRoomScreenState extends State<ExchangeRoomScreen> {
  final app = AppState();
  Map<String, dynamic>? room;
  bool loading = true;
  final contentCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/exchange-rooms/${widget.roomId}', options: app.authHeaders);
      setState(() { room = res.data['data']; loading = false; });
    } catch (e) {
      setState(() => loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _writeDiary() async {
    final content = contentCtrl.text.trim();
    if (content.length < 200) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('200자 이상 작성해주세요.')));
      return;
    }
    try {
      final res = await app.dio.post('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/diaries',
        data: {'content': content}, options: app.authHeaders);
      final data = res.data['data'];
      contentCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(data['isCompleted'] == true
            ? '4턴 완주! 관계 확장을 선택해주세요.'
            : '교환일기 작성 완료! (턴 ${data['nextTurn']})')));
      }
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _addReaction(int diaryId, String reaction) async {
    try {
      await app.dio.post('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/diaries/$diaryId/reaction',
        data: {'reaction': reaction}, options: app.authHeaders);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$reaction 리액션 완료!')));
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _chooseNextStep(String choice) async {
    try {
      final res = await app.dio.post('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/next-step',
        data: {'choice': choice}, options: app.authHeaders);
      final data = res.data['data'];
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('결과: ${data['status']}')));
      }
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _viewReport() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/report', options: app.authHeaders);
      final data = res.data['data'];
      if (mounted) {
        showDialog(context: context, builder: (_) => AlertDialog(
          title: const Text('AI 공통점 리포트'),
          content: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('상태: ${data['status']}', style: const TextStyle(fontWeight: FontWeight.bold)),
            if (data['commonKeywords'] != null) ...[
              const SizedBox(height: 8),
              const Text('공통 키워드:', style: TextStyle(fontWeight: FontWeight.bold)),
              Wrap(children: (data['commonKeywords'] as List).map((k) =>
                Chip(label: Text(k), backgroundColor: Colors.orange.withOpacity(0.2))).toList()),
            ],
            if (data['emotionSimilarity'] != null)
              Text('감정 유사도: ${(data['emotionSimilarity'] * 100).toStringAsFixed(0)}%'),
            if (data['aiDescription'] != null) ...[
              const SizedBox(height: 8),
              Text(data['aiDescription']),
            ],
          ])),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('닫기'))],
        ));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _checkNextStepStatus() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/next-step/status',
        options: app.authHeaders);
      final data = res.data['data'];
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('내 선택: ${data['myChoice'] ?? '미선택'} | 상대: ${data['partnerChose'] == true ? '완료' : '대기중'} | 상태: ${data['status']}')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return Scaffold(appBar: AppBar(), body: const Center(child: CircularProgressIndicator()));
    if (room == null) return Scaffold(appBar: AppBar(), body: const Center(child: Text('방 정보 로드 실패')));

    final diaries = (room!['diaries'] as List?) ?? [];
    final status = room!['status'] as String;
    final isMyTurn = room!['isMyTurn'] == true;
    final partner = room!['partner'];

    return Scaffold(
      appBar: AppBar(
        title: Text('${partner['nickname']}님과의 교환일기'),
        actions: [
          if (status == 'COMPLETED' || status == 'CHAT_CONNECTED' || status == 'ARCHIVED')
            IconButton(icon: const Icon(Icons.analytics), onPressed: _viewReport, tooltip: '리포트'),
          if (status == 'COMPLETED')
            IconButton(icon: const Icon(Icons.info_outline), onPressed: _checkNextStepStatus, tooltip: '선택 상태'),
        ],
      ),
      body: Column(children: [
        // 상태 바
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          color: status == 'COMPLETED' ? Colors.green.withOpacity(0.15) : Colors.orange.withOpacity(0.1),
          child: Row(children: [
            Text('라운드 ${room!['roundNumber']} | 턴 ${room!['currentTurn']}/4', style: const TextStyle(fontWeight: FontWeight.bold)),
            const Spacer(),
            Text(status, style: TextStyle(
              color: status == 'COMPLETED' ? Colors.greenAccent : Colors.orangeAccent,
              fontWeight: FontWeight.bold)),
          ]),
        ),

        // 일기 목록
        Expanded(child: diaries.isEmpty
          ? const Center(child: Text('아직 작성된 일기가 없습니다.', style: TextStyle(color: Colors.white54)))
          : ListView.builder(
              itemCount: diaries.length,
              itemBuilder: (_, i) {
                final d = diaries[i];
                final isMe = d['authorId'] == app.userId;
                return Card(
                  margin: EdgeInsets.fromLTRB(isMe ? 48 : 8, 4, isMe ? 8 : 48, 4),
                  color: isMe ? Colors.orange.withOpacity(0.15) : Colors.blue.withOpacity(0.15),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Text('턴 ${d['turnNumber']}', style: TextStyle(
                          fontWeight: FontWeight.bold, color: isMe ? Colors.orangeAccent : Colors.blueAccent)),
                        const Spacer(),
                        Text(isMe ? '나' : partner['nickname'], style: const TextStyle(fontSize: 12, color: Colors.white54)),
                      ]),
                      const SizedBox(height: 8),
                      Text(d['content'] ?? '', style: const TextStyle(fontSize: 14, height: 1.5)),
                      const SizedBox(height: 8),
                      Row(children: [
                        if (d['reaction'] != null)
                          Chip(label: Text(_reactionEmoji(d['reaction'])), backgroundColor: Colors.orange.withOpacity(0.2)),
                        const Spacer(),
                        if (!isMe && d['reaction'] == null)
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.emoji_emotions, size: 20),
                            onSelected: (r) => _addReaction(d['diaryId'], r),
                            itemBuilder: (_) => [
                              const PopupMenuItem(value: 'HEART', child: Text('HEART')),
                              const PopupMenuItem(value: 'SAD', child: Text('SAD')),
                              const PopupMenuItem(value: 'HAPPY', child: Text('HAPPY')),
                              const PopupMenuItem(value: 'FIRE', child: Text('FIRE')),
                            ],
                          ),
                      ]),
                    ]),
                  ),
                );
              },
            )),

        // 하단 액션 영역
        if (status == 'ACTIVE' && isMyTurn)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.grey[900], border: Border(top: BorderSide(color: Colors.grey[800]!))),
            child: Column(children: [
              TextField(
                controller: contentCtrl,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: '교환일기를 작성해주세요 (200~1,000자)',
                  border: const OutlineInputBorder(),
                  suffixText: '${contentCtrl.text.length}자',
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 8),
              SizedBox(width: double.infinity, child: ElevatedButton(
                onPressed: _writeDiary,
                child: const Text('교환일기 제출'),
              )),
            ]),
          ),

        // 관계 확장 선택 (COMPLETED 상태)
        if (status == 'COMPLETED' && room!['nextStepRequired'] == true)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.green.withOpacity(0.1),
              border: Border(top: BorderSide(color: Colors.green.withOpacity(0.3)))),
            child: Column(children: [
              const Text('교환일기가 완료되었습니다! 다음 단계를 선택해주세요.',
                style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: ElevatedButton.icon(
                  onPressed: () => _chooseNextStep('CHAT'),
                  icon: const Icon(Icons.chat),
                  label: const Text('채팅 시작'),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                )),
                const SizedBox(width: 8),
                Expanded(child: OutlinedButton.icon(
                  onPressed: () => _chooseNextStep('CONTINUE'),
                  icon: const Icon(Icons.swap_horiz),
                  label: const Text('교환 계속'),
                )),
              ]),
            ]),
          ),
      ]),
    );
  }

  String _reactionEmoji(String reaction) {
    switch (reaction) {
      case 'HEART': return 'HEART';
      case 'SAD': return 'SAD';
      case 'HAPPY': return 'HAPPY';
      case 'FIRE': return 'FIRE';
      default: return reaction;
    }
  }
}

// ══════════════════════════════════════
// 7~8. 채팅 + 커플 탭
// ══════════════════════════════════════
class ChatTab extends StatefulWidget {
  final bool standaloneAppBar;
  const ChatTab({super.key, this.standaloneAppBar = true});

  @override
  State<ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends State<ChatTab> {
  final app = AppState();
  List<dynamic> chatRooms = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final res = await app.dio.get('${app.baseUrl}/api/chat-rooms', options: app.authHeaders);
      setState(() {
        chatRooms = res.data['data']['chatRooms'] ?? [];
        loading = false;
      });
    } catch (e) {
      setState(() => loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(title: const Text('채팅')) : null,
      body: loading
        ? const Center(child: CircularProgressIndicator())
        : chatRooms.isEmpty
          ? Center(child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.chat_bubble_outline, size: 64, color: Colors.white24),
                SizedBox(height: 12),
                Text('채팅방이 없어요', style: TextStyle(color: Colors.white54)),
                SizedBox(height: 8),
                Text('교환일기 완료 후 채팅이 시작됩니다', style: TextStyle(color: Colors.white38, fontSize: 13)),
              ],
            ))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                itemCount: chatRooms.length,
                itemBuilder: (_, i) => _buildChatRoomCard(chatRooms[i]),
              ),
            ),
    );
  }

  Widget _buildChatRoomCard(Map<String, dynamic> room) {
    final status = room['status'] as String;
    Color statusColor = Colors.blueAccent;
    if (status == 'COUPLE_CONFIRMED') statusColor = Colors.pinkAccent;
    if (status == 'CHAT_LEFT') statusColor = Colors.grey;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Icon(status == 'COUPLE_CONFIRMED' ? Icons.favorite : Icons.chat, color: statusColor, size: 20),
        ),
        title: Text(room['partnerNickname'] ?? '???', style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(room['lastMessage'] ?? '대화를 시작해보세요', maxLines: 1, overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white54, fontSize: 13)),
        trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          if (room['lastMessageAt'] != null)
            Text(_formatTime(room['lastMessageAt']), style: const TextStyle(fontSize: 11, color: Colors.white38)),
          if ((room['unreadCount'] ?? 0) > 0) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: Colors.orangeAccent, borderRadius: BorderRadius.circular(10)),
              child: Text('${room['unreadCount']}', style: const TextStyle(fontSize: 11, color: Colors.black)),
            ),
          ],
        ]),
        onTap: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => ChatRoomScreen(chatRoomId: room['chatRoomId'], partnerName: room['partnerNickname'] ?? '???'))),
      ),
    );
  }

  String _formatTime(String time) {
    try {
      final dt = DateTime.parse(time);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) { return ''; }
  }
}

// ── 채팅방 상세 화면 ──
class ChatRoomScreen extends StatefulWidget {
  final int chatRoomId;
  final String partnerName;
  const ChatRoomScreen({super.key, required this.chatRoomId, required this.partnerName});

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final app = AppState();
  final msgCtrl = TextEditingController();
  final scrollCtrl = ScrollController();
  List<dynamic> messages = [];
  bool loading = true;
  bool hasMore = false;
  bool sending = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _startPolling();
  }

  @override
  void dispose() {
    _polling = false;
    super.dispose();
  }

  bool _polling = true;

  void _startPolling() async {
    while (_polling && mounted) {
      await Future.delayed(const Duration(seconds: 3));
      if (_polling && mounted && !sending) {
        _loadMessages();
      }
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (scrollCtrl.hasClients) {
        scrollCtrl.animateTo(scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _loadMessages({int? before}) async {
    try {
      final params = <String, dynamic>{'size': 30};
      if (before != null) params['before'] = before;
      final res = await app.dio.get('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/messages',
        queryParameters: params, options: app.authHeaders);
      final data = res.data['data'];
      setState(() {
        if (before != null) {
          messages.insertAll(0, data['messages'] ?? []);
        } else {
          messages = List.from(data['messages'] ?? []);
        }
        hasMore = data['hasMore'] == true;
        loading = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() => loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _send() async {
    final content = msgCtrl.text.trim();
    if (content.isEmpty || sending) return;
    setState(() => sending = true);

    try {
      // REST로 메시지 전송 (DB 저장 + sequenceId 발급)
      await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/messages',
        data: {'content': content, 'type': 'TEXT'}, options: app.authHeaders);
      msgCtrl.clear();
      // 항상 새로고침
      await _loadMessages();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
    setState(() => sending = false);
  }

  Future<void> _showPartnerProfile() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/profile',
        options: app.authHeaders);
      final p = res.data['data'];
      if (mounted) {
        showDialog(context: context, builder: (_) => AlertDialog(
          title: Text(p['nickname'] ?? '???'),
          content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('성별: ${p['gender'] ?? '비공개'}'),
            Text('생년월일: ${p['birthDate'] ?? '비공개'}'),
            Text('지역: ${p['sido'] ?? '비공개'}'),
          ]),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('닫기'))],
        ));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _sendCoupleRequest() async {
    try {
      final res = await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/couple-request',
        options: app.authHeaders);
      final data = res.data['data'];
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('커플 요청 전송! (만료: ${data['expiresAt']})')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _acceptCouple() async {
    try {
      final res = await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/couple-accept',
        options: app.authHeaders);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('커플이 되었습니다!')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _rejectCouple() async {
    try {
      await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/couple-reject',
        options: app.authHeaders);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('커플 요청을 거절했습니다.')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _leaveChatRoom() async {
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('채팅방 나가기'),
      content: const Text('나가면 다시 돌아올 수 없습니다. 정말 나가시겠어요?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('취소')),
        TextButton(onPressed: () => Navigator.pop(context, true),
          child: const Text('나가기', style: TextStyle(color: Colors.red))),
      ],
    ));
    if (confirmed != true) return;

    try {
      await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/leave', options: app.authHeaders);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('채팅방을 나갔습니다.')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.partnerName),
        actions: [
          IconButton(icon: const Icon(Icons.person), onPressed: _showPartnerProfile, tooltip: '프로필'),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'couple_request') _sendCoupleRequest();
              if (v == 'couple_accept') _acceptCouple();
              if (v == 'couple_reject') _rejectCouple();
              if (v == 'leave') _leaveChatRoom();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'couple_request', child: Text('커플 요청')),
              const PopupMenuItem(value: 'couple_accept', child: Text('커플 수락')),
              const PopupMenuItem(value: 'couple_reject', child: Text('커플 거절')),
              const PopupMenuItem(value: 'leave', child: Text('나가기', style: TextStyle(color: Colors.red))),
            ],
          ),
        ],
      ),
      body: Column(children: [
        // 메시지 목록
        Expanded(
          child: loading
            ? const Center(child: CircularProgressIndicator())
            : messages.isEmpty
              ? const Center(child: Text('대화를 시작해보세요!', style: TextStyle(color: Colors.white54)))
              : ListView.builder(
                  controller: scrollCtrl,
                  itemCount: messages.length,
                  itemBuilder: (_, i) {
                    final msg = messages[i];
                    final isMe = msg['senderId'] == app.userId;
                    final isSystem = msg['type'] == 'SYSTEM';

                    if (isSystem) {
                      return Center(child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Text(msg['content'] ?? '', style: const TextStyle(color: Colors.white38, fontSize: 12)),
                      ));
                    }

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: EdgeInsets.fromLTRB(isMe ? 64 : 8, 2, isMe ? 8 : 64, 2),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isMe ? Colors.orange.withOpacity(0.3) : Colors.grey[800],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(msg['content'] ?? '', style: const TextStyle(fontSize: 14)),
                          const SizedBox(height: 2),
                          Text(
                            msg['createdAt'] != null ? _formatMsgTime(msg['createdAt']) : '',
                            style: const TextStyle(fontSize: 10, color: Colors.white38),
                          ),
                          if (msg['isFlagged'] == true)
                            const Text('! 외부연락처 감지', style: TextStyle(fontSize: 10, color: Colors.redAccent)),
                        ]),
                      ),
                    );
                  },
                ),
        ),

        // 입력창
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: Colors.grey[900], border: Border(top: BorderSide(color: Colors.grey[800]!))),
          child: Row(children: [
            Expanded(child: TextField(
              controller: msgCtrl,
              decoration: const InputDecoration(
                hintText: '메시지를 입력하세요',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              onSubmitted: (_) => _send(),
            )),
            const SizedBox(width: 8),
            IconButton(
              icon: Icon(Icons.send, color: sending ? Colors.grey : Colors.orangeAccent),
              onPressed: sending ? null : _send,
            ),
          ]),
        ),
      ]),
    );
  }

  String _formatMsgTime(String time) {
    try {
      final dt = DateTime.parse(time);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) { return ''; }
  }
}
