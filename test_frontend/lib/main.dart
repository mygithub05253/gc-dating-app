import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:kakao_flutter_sdk_user/kakao_flutter_sdk_user.dart';

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
// 홈 화면 (도메인 4: 일기)
// ══════════════════════════════════════
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final app = AppState();
  int _currentTab = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      const DiaryWriteTab(),
      const DiaryHistoryTab(),
      const DraftTab(),
      const SettingsTab(),
    ];

    return Scaffold(
      body: pages[_currentTab],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTab,
        onTap: (i) => setState(() => _currentTab = i),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.edit), label: '일기 쓰기'),
          BottomNavigationBarItem(icon: Icon(Icons.list), label: '히스토리'),
          BottomNavigationBarItem(icon: Icon(Icons.drafts), label: '임시저장'),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: '설정'),
        ],
      ),
    );
  }
}

// ── 4.1 일기 작성 탭 ──
class DiaryWriteTab extends StatefulWidget {
  const DiaryWriteTab({super.key});

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
          data: {'content': contentCtrl.text}, options: app.authHeaders);
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
      appBar: AppBar(
        title: Text('${now.month}월 ${now.day}일 (${['월','화','수','목','금','토','일'][now.weekday - 1]})'),
        actions: [
          if (todayExists == true)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Chip(label: Text('작성됨', style: TextStyle(fontSize: 11))),
            ),
        ],
      ),
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

// ── 4.4 일기 히스토리 탭 ──
class DiaryHistoryTab extends StatefulWidget {
  const DiaryHistoryTab({super.key});

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
      appBar: AppBar(title: const Text('나의 일기')),
      body: diaries.isEmpty
        ? Center(child: Text(message ?? '일기가 없습니다', style: const TextStyle(color: Colors.white54)))
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: diaries.length,
              itemBuilder: (context, index) {
                final d = diaries[index];
                return Card(
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

// ── 임시저장 탭 ──
class DraftTab extends StatefulWidget {
  const DraftTab({super.key});

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
      appBar: AppBar(title: Text('임시저장 (${drafts.length}/3)')),
      body: drafts.isEmpty
        ? Center(child: Text(message ?? '임시저장된 일기가 없습니다', style: const TextStyle(color: Colors.white54)))
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

// ── 설정 탭 (로그아웃 등) ──
class SettingsTab extends StatelessWidget {
  const SettingsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppState();
    return Scaffold(
      appBar: AppBar(title: const Text('설정')),
      body: ListView(
        children: [
          ListTile(
            title: const Text('내 프로필'),
            leading: const Icon(Icons.person),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me', options: app.authHeaders);
                final data = res.data['data'];
                if (context.mounted) {
                  showDialog(context: context, builder: (_) => AlertDialog(
                    title: Text(data['nickname'] ?? ''),
                    content: Text(
                      '성별: ${data['gender']}\n'
                      '지역: ${data['sido']} ${data['sigungu']}\n'
                      '학교: ${data['school'] ?? '미입력'}\n'
                      '온보딩: step=${data['onboardingStep']}\n'
                      '키워드: ${data['idealKeywords']?.length ?? 0}개'),
                  ));
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(app.errMsg(e))));
                }
              }
            },
          ),
          ListTile(
            title: const Text('토큰 갱신'),
            leading: const Icon(Icons.refresh),
            onTap: () async {
              try {
                final res = await app.dio.post('${app.baseUrl}/api/auth/refresh',
                  data: {'refreshToken': app.refreshToken});
                app.accessToken = res.data['data']['accessToken'];
                app.refreshToken = res.data['data']['refreshToken'];
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('토큰 갱신 성공!')));
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(app.errMsg(e))));
                }
              }
            },
          ),
          const Divider(),
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
        ],
      ),
    );
  }
}
