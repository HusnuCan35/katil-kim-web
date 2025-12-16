import { Case, Suspect, Clue, TimelineEvent, EvidenceCombination } from '@/types';

export const CASE_1 = {
    id: 'case-1',
    title: 'Karanlık Malikane',
    intro: 'Ünlü iş adamı Vedat Bey, kendi malikanesinde ölü bulundu. Kapılar kilitliydi. Katil hala içeride olabilir.',
    suspects: [
        {
            id: 's1',
            name: 'Aşçı',
            bio: 'Uzun süredir evde çalışıyor. Vedat Bey ile maaş konusunda tartışmış.',
            detailed_bio: 'Mehmet Usta, 15 yıldır bu evde. Eskiden ünlü bir restoranı vardı ama kumar borçları yüzünden batırdı. Vedat Bey ona iş verdi ama sürekli aşağıladı. Son zamanlarda maaşına zam istemişti ama reddedildi.',
            motive: 'Para ve onur. Vedat Bey onu herkesin içinde aşağılamıştı.',
            relationships: [
                { target_id: 's4', type: 'Romantik', description: 'Hizmetçi ile gizli bir ilişkisi var.' },
                { target_id: 's3', type: 'Borçlu', description: 'Yeğen\'den borç para almış.' }
            ],
            dialogues: [
                { id: 'q1', text: 'Olay gecesi neredeydiniz?', response: 'Mutftaktaydım, efendim. Akşam yemeği için hazırlık yapıyordum. Hizmetçi buna şahittir.' },
                { id: 'q2', text: 'Vedat Bey ile aranız nasıldı?', response: 'Patron biraz... cimriydi. Ama onu öldürecek kadar değil! Sadece hakkımı istiyordum.' },
                { id: 'q3', text: 'Yemeğe zehir katmış olabilir misiniz?', response: 'Asla! Ben bir profesyonelim. Ayrıca yemeği ben hazırladım ama servisi ben yapmadım.' }
            ]
        },
        {
            id: 's2',
            name: 'Bahçıvan',
            bio: 'Olay saatinde bahçedeydi ama arka kapının anahtarı onda var.',
            detailed_bio: 'Sessiz, kendi halinde biri gibi görünür ama eski bir sabıkası var. Hırsızlıktan yatmış. Vedat Bey bunu biliyordu ve onu polise ihbar etmekle tehdit ediyordu.',
            motive: 'Şantaj. Vedat Bey geçmişini ortaya dökmekle tehdit ediyordu.',
            relationships: [
                { target_id: 's1', type: 'Düşman', description: 'Aşçı ile sürekli tartışırlar.' }
            ],
            dialogues: [
                { id: 'q1', text: 'Arka kapıdan kimin çıktığını gördünüz?', response: 'Karanlıktı, tam seçemedim. Ama uzun boylu biriydi. Belki bir erkek... ya da uzun boylu bir kadın.' },
                { id: 'q2', text: 'Neden içeri girmediniz?', response: 'Benim işim bahçeyle. Evin içine pek karışmam. Ayrıca Vedat Bey beni içeride görmekten hoşlanmazdı.' }
            ]
        },
        {
            id: 's3',
            name: 'Yeğen',
            bio: 'Mirasın tek varisi. Kumar borçları olduğu biliniyor.',
            detailed_bio: 'Şımarık büyütülmüş, çalışmayı sevmeyen biri. Tefecilere büyük borcu var. Amcası son zamanlarda para musluğunu kesmişti.',
            motive: 'Miras. Borçlarını ödemek için acil paraya ihtiyacı var.',
            relationships: [
                { target_id: 's1', type: 'Alacaklı', description: 'Aşçı\'ya faizle borç vermiş.' }
            ],
            dialogues: [
                { id: 'q1', text: 'Amcanızla son görüşmeniz nasıldı?', response: 'Sıradan bir amca-yeğen sohbetiydi. Ona işlerimden bahsettim.' },
                { id: 'q2', text: 'Borçlarınız olduğu doğru mu?', response: 'Herkesin borcu vardır memur bey. Bu beni katil yapmaz. Amcam bana yardım edecekti.' },
                { id: 'q3', text: 'O gece neredeydiniz?', response: 'Şehirdeydim. Arkadaşlarımla... İsterseniz arayıp sorabilirsiniz.' }
            ]
        },
        {
            id: 's4',
            name: 'Hizmetçi',
            bio: 'Cesedi ilk bulan kişi. Çok korkmuş görünüyor.',
            detailed_bio: 'Genç ve güzel bir kadın. Vedat Bey\'in ona karşı ilgisi olduğu dedikoduları var. Aşçı ile gizlice evlenmeyi planlıyorlar.',
            motive: 'Kendini koruma. Vedat Bey\'in tacizlerinden bıkmıştı.',
            relationships: [
                { target_id: 's1', type: 'Romantik', description: 'Aşçı ile evlenmeyi planlıyor.' }
            ],
            dialogues: [
                { id: 'q1', text: 'Cesedi nasıl buldunuz?', response: 'Sabah kahvesini götürmüştüm... Kapıyı çaldım, ses gelmeyince girdim ve... (Ağlamaya başlar)' },
                { id: 'q2', text: 'Yemeği siz mi servis ettiniz?', response: 'Evet, tepsiyi ben götürdüm. Ama yolda kimseyle konuşmadım, tepsiyi de bırakmadım.' }
            ]
        },
    ],
    clues: [
        {
            id: 'c1',
            title: 'Otopsi Raporu',
            description: 'Maktul zehirlenmiş. Zehir, yemeğine karıştırılmış olabilir.',
            visible_to: 'DETECTIVE_A',
            is_locked: false,
        },
        {
            id: 'c2',
            title: 'Mutfak Kayıtları',
            description: 'Akşam yemeğini Aşçı hazırladı ama servisi Hizmetçi yaptı.',
            visible_to: 'DETECTIVE_B',
            is_locked: false,
        },
        {
            id: 'c3',
            title: 'Bahçıvanın İfadesi',
            description: '"Arka kapıdan birinin çıktığını gördüm ama yüzünü seçemedim. Uzun boyluydu."',
            visible_to: 'DETECTIVE_A',
            is_locked: true, // Unlocks later
        },
        {
            id: 'c4',
            title: 'Yeğenin Telefonu',
            description: 'Telefon kilitli. 4 haneli bir şifre istiyor. Duvar kağıdında "Doğum Günüm" yazıyor.',
            visible_to: 'DETECTIVE_B',
            is_locked: true,
            locked_with_code: '1990', // The code to unlock
        },
        {
            id: 'c5',
            title: 'Eski Takvim',
            description: 'Mutfakta asılı bir takvim. 1990 yılına ait. Bir tarih işaretlenmiş: "Yeğenin Doğumu".',
            visible_to: 'DETECTIVE_A',
            is_locked: false,
        },
        {
            id: 'c6',
            title: 'Zehir Şişesi',
            description: 'Bahçedeki kulübede bulundu. Üzerinde parmak izi yok.',
            visible_to: 'BOTH', // Shared clue
            is_locked: false,
        },
        {
            id: 'c8',
            title: 'Çamurlu Ayak İzi',
            description: 'Arka kapının önünde 42 numara bir erkek ayakkabısı izi.',
            visible_to: 'BOTH',
            is_locked: false,
        }
    ] as Clue[],
    timeline_events: [
        { id: 't1', title: 'Akşam Yemeği Servisi', time: '19:30', description: 'Hizmetçi yemeği servis etti.', correct_order: 1 },
        { id: 't2', title: 'Elektrik Kesintisi', time: '20:00', description: 'Tüm evde ışıklar gitti.', correct_order: 2 },
        { id: 't3', title: 'Cam Kırılma Sesi', time: '20:15', description: 'Bahçeden bir ses duyuldu.', correct_order: 3 },
        { id: 't4', title: 'Cesedin Bulunması', time: '08:00', description: 'Hizmetçi odaya girdi.', correct_order: 4 }
    ],
    evidence_combinations: [
        {
            id: 'ec1',
            clue_id_1: 'c1', // Otopsi Raporu (Zehir)
            clue_id_2: 'c6', // Zehir Şişesi
            result_clue: {
                id: 'c7',
                title: 'Zehir Analizi',
                description: 'Şişedeki kalıntılar ile maktulün kanındaki zehir eşleşti: Arsenik. Bu tür, eski tarım ilaçlarında bulunur.',
                visible_to: 'BOTH',
                is_locked: false,
                type: 'ANALYSIS'
            }
        },
        {
            id: 'ec2',
            clue_id_1: 'c3', // Bahçıvanın İfadesi (Gördüm)
            clue_id_2: 'c8', // Ayak İzi
            result_clue: {
                id: 'c9',
                title: 'İfade Doğrulama',
                description: 'Ayak izleri Bahçıvanın tarif ettiği noktada. Biri gerçekten arka kapıdan çıkmış.',
                visible_to: 'BOTH',
                is_locked: false,
                type: 'ANALYSIS'
            }
        },
        {
            id: 'ec3',
            clue_id_1: 'c2', // Mutfak Kayıtları
            clue_id_2: 'c6', // Zehir Şişesi
            result_clue: {
                id: 'c10',
                title: 'Zehir Kaynağı',
                description: 'Mutfak envanterinde zehir yok. Zehir dışarıdan (bahçeden) getirilmiş.',
                visible_to: 'BOTH',
                is_locked: false,
                type: 'ANALYSIS'
            }
        }
    ] as EvidenceCombination[],
    solution: {
        killer_id: 's3',
        killer_name: 'Yeğen',
        motive: 'Kumar borçlarını ödemek için amcasını zehirledi.'
    }
};
